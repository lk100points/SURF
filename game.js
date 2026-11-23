import * as THREE from 'three';

// ==========================================
// 1. CONFIG & PALETTE
// ==========================================
const COLORS = {
    bgDark: 0x0B1020,
    bgDarker: 0x101A33,
    asphalt: 0x14161C,
    roadLine: 0xE8EEF7,
    lightWarm: 0xFFB35C,
    lightCold: 0x4FD1FF,
    teaGreen: 0x7CFF6B,
    policeBlue: 0x3C7BFF,
    policeRed: 0xFF3C4E,
    jeans: 0x1E2A4A,
    hair: 0x1A1513,
    skin: 0xFFCBA4
};

const SWEATER_COLORS = [
    { id: 's_grey', color: 0x4A5568, price: 0 },
    { id: 's_blue', color: 0x2B6CB0, price: 0 },
    { id: 's_red', color: 0xC53030, price: 20 },
    { id: 's_green', color: 0x2F855A, price: 50 },
    { id: 's_yellow', color: 0xD69E2E, price: 100 },
    { id: 's_black', color: 0x1A202C, price: 200 }
];

const SNEAKER_COLORS = [
    { id: 'sn_white', color: 0xE2E8F0, price: 0 },
    { id: 'sn_black', color: 0x1A202C, price: 0 },
    { id: 'sn_red', color: 0xE53E3E, price: 20 },
    { id: 'sn_cyan', color: 0x00B5D8, price: 50 },
    { id: 'sn_purple', color: 0x6B46C1, price: 100 },
    { id: 'sn_orange', color: 0xDD6B20, price: 200 }
];

const LANE_WIDTH = 2.5;
const SPEED_INITIAL = 15;
const SPEED_MAX = 35;

// ==========================================
// 2. AUDIO MANAGER (WebAudio Synth)
// ==========================================
class AudioManager {
    constructor() {
        this.ctx = null;
        this.enabled = false;
    }

    init() {
        if (!this.ctx) {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.enabled = true;
        }
    }

    playTone(freq, type, duration, vol=0.1) {
        if (!this.enabled) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    jump() { this.playTone(300, 'sine', 0.2, 0.1); }
    slide() { this.playTone(150, 'triangle', 0.2, 0.1); }
    collect() { this.playTone(800, 'sine', 0.1, 0.05); }
    crash() {
        this.playTone(100, 'sawtooth', 0.4, 0.2);
        this.playTone(80, 'square', 0.5, 0.2);
    }
    buy() { this.playTone(600, 'sine', 0.1); setTimeout(() => this.playTone(900, 'sine', 0.2), 100); }
}
const audio = new AudioManager();

// ==========================================
// 3. INPUT MANAGER
// ==========================================
class InputManager {
    constructor(game) {
        this.game = game;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.isSwiping = false;

        this.initKeyboard();
        this.initTouch();
    }

    initKeyboard() {
        window.addEventListener('keydown', (e) => {
            audio.init();
            // Prevent default for game keys to stop scrolling
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'w', 'a', 's', 'd'].includes(e.key.toLowerCase())) {
                e.preventDefault();
            }

            // Handle UI navigation vs Gameplay
            if (this.game.state === 'PLAYING') {
                if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') this.game.player.moveLeft();
                if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') this.game.player.moveRight();
                if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w' || e.key === ' ') this.game.player.jump();
                if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') this.game.player.slide();
                if (e.key === 'Escape') this.game.ui.showMenu();
            } else {
                if (e.key === 'Enter' || e.key === ' ') {
                    const activeEl = document.activeElement;
                    if (activeEl && activeEl.tagName === 'BUTTON') {
                        activeEl.click();
                    }
                }
                if (e.key === 'Escape') {
                    if (this.game.state === 'SHOP') this.game.ui.showMenu();
                    if (this.game.state === 'GAMEOVER') this.game.ui.showMenu();
                }
            }
        });
    }

    initTouch() {
        const container = document.getElementById('game-container');
        
        container.addEventListener('touchstart', (e) => {
            audio.init();
            this.touchStartX = e.changedTouches[0].screenX;
            this.touchStartY = e.changedTouches[0].screenY;
            this.isSwiping = true;
        }, { passive: true });

        container.addEventListener('touchend', (e) => {
            if (!this.isSwiping) return;
            this.isSwiping = false;
            
            const touchEndX = e.changedTouches[0].screenX;
            const touchEndY = e.changedTouches[0].screenY;
            const diffX = touchEndX - this.touchStartX;
            const diffY = touchEndY - this.touchStartY;

            if (this.game.state === 'PLAYING') {
                // Tap
                if (Math.abs(diffX) < 30 && Math.abs(diffY) < 30) {
                    this.game.player.jump();
                    return;
                }

                // Swipe
                if (Math.abs(diffX) > Math.abs(diffY)) {
                    if (diffX > 30) this.game.player.moveRight();
                    else if (diffX < -30) this.game.player.moveLeft();
                } else {
                    if (diffY > 30) this.game.player.slide();
                    else if (diffY < -30) this.game.player.jump();
                }
            }
        }, { passive: true });
        
        // Prevent click jump if clicking UI buttons
        document.getElementById('game-canvas').addEventListener('mousedown', (e) => {
            if (this.game.state === 'PLAYING') {
                this.game.player.jump();
            }
        });
    }
}

// ==========================================
// 4. PLAYER CLASS
// ==========================================
class Player {
    constructor(scene) {
        this.scene = scene;
        this.group = new THREE.Group();
        this.scene.add(this.group);

        this.laneIndex = 1; // 0, 1, 2
        this.targetX = 0;
        this.currentY = 0;
        this.velocityY = 0;
        this.isJumping = false;
        this.isSliding = false;
        this.slideTimer = 0;
        
        this.runTime = 0;

        // Materials for customization
        this.sweaterMat = new THREE.MeshStandardMaterial({ color: 0x4A5568, roughness: 0.8 });
        this.sneakerMat = new THREE.MeshStandardMaterial({ color: 0xE2E8F0, roughness: 0.7 });
        this.jeansMat = new THREE.MeshStandardMaterial({ color: COLORS.jeans, roughness: 0.9 });
        this.skinMat = new THREE.MeshStandardMaterial({ color: COLORS.skin, roughness: 0.6 });
        this.hairMat = new THREE.MeshStandardMaterial({ color: COLORS.hair, roughness: 0.9 });
        this.darkMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 });

        this.buildModel();
    }

    buildModel() {
        // Torso
        const torsoGeo = new THREE.BoxGeometry(0.6, 0.8, 0.35);
        this.torso = new THREE.Mesh(torsoGeo, this.sweaterMat);
        this.torso.position.y = 1.1;
        this.torso.castShadow = true;
        this.group.add(this.torso);

        // Head & Neck
        const neckGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.15);
        const neck = new THREE.Mesh(neckGeo, this.skinMat);
        neck.position.y = 1.55;
        this.group.add(neck);

        const headGeo = new THREE.BoxGeometry(0.4, 0.45, 0.4);
        this.head = new THREE.Mesh(headGeo, this.skinMat);
        this.head.position.y = 1.85;
        this.group.add(this.head);

        // Modcut Hair
        const hairTopGeo = new THREE.BoxGeometry(0.44, 0.2, 0.44);
        const hairTop = new THREE.Mesh(hairTopGeo, this.hairMat);
        hairTop.position.set(0, 2.05, 0);
        this.group.add(hairTop);

        const hairFrontGeo = new THREE.BoxGeometry(0.44, 0.25, 0.1);
        const hairFront = new THREE.Mesh(hairFrontGeo, this.hairMat);
        hairFront.position.set(0, 1.9, 0.2);
        hairFront.rotation.x = -0.2;
        this.group.add(hairFront);

        // Left Arm (with Watch)
        this.leftArm = new THREE.Group();
        this.leftArm.position.set(-0.4, 1.45, 0);
        
        const armGeo = new THREE.CapsuleGeometry(0.08, 0.5);
        const armMesh = new THREE.Mesh(armGeo, this.sweaterMat);
        armMesh.position.y = -0.25;
        this.leftArm.add(armMesh);

        const watchGeo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
        const watchMesh = new THREE.Mesh(watchGeo, this.darkMat);
        watchMesh.position.set(0, -0.4, 0.05);
        this.leftArm.add(watchMesh);
        
        const watchFaceGeo = new THREE.PlaneGeometry(0.08, 0.08);
        const watchFaceMat = new THREE.MeshBasicMaterial({ color: COLORS.lightCold });
        const watchFace = new THREE.Mesh(watchFaceGeo, watchFaceMat);
        watchFace.position.set(0, -0.4, 0.112);
        this.leftArm.add(watchFace);

        this.group.add(this.leftArm);

        // Right Arm
        this.rightArm = new THREE.Group();
        this.rightArm.position.set(0.4, 1.45, 0);
        const rArmMesh = new THREE.Mesh(armGeo, this.sweaterMat);
        rArmMesh.position.y = -0.25;
        this.rightArm.add(rArmMesh);
        this.group.add(this.rightArm);

        // Left Leg
        this.leftLeg = new THREE.Group();
        this.leftLeg.position.set(-0.2, 0.7, 0);
        
        const legGeo = new THREE.CapsuleGeometry(0.12, 0.5);
        const legMesh = new THREE.Mesh(legGeo, this.jeansMat);
        legMesh.position.y = -0.3;
        this.leftLeg.add(legMesh);

        const shoeGeo = new THREE.BoxGeometry(0.2, 0.15, 0.35);
        const shoeMesh = new THREE.Mesh(shoeGeo, this.sneakerMat);
        shoeMesh.position.set(0, -0.65, 0.05);
        this.leftLeg.add(shoeMesh);
        this.group.add(this.leftLeg);

        // Right Leg
        this.rightLeg = new THREE.Group();
        this.rightLeg.position.set(0.2, 0.7, 0);
        const rLegMesh = new THREE.Mesh(legGeo, this.jeansMat);
        rLegMesh.position.y = -0.3;
        this.rightLeg.add(rLegMesh);
        
        const rShoeMesh = new THREE.Mesh(shoeGeo, this.sneakerMat);
        rShoeMesh.position.set(0, -0.65, 0.05);
        this.rightLeg.add(rShoeMesh);
        this.group.add(this.rightLeg);
    }

    setColors(sweaterHex, sneakerHex) {
        this.sweaterMat.color.setHex(sweaterHex);
        this.sneakerMat.color.setHex(sneakerHex);
    }

    moveLeft() {
        if (this.laneIndex > 0) {
            this.laneIndex--;
            this.targetX = (this.laneIndex - 1) * LANE_WIDTH;
            audio.jump(); // Using jump sound for lane swap
        }
    }

    moveRight() {
        if (this.laneIndex < 2) {
            this.laneIndex++;
            this.targetX = (this.laneIndex - 1) * LANE_WIDTH;
            audio.jump();
        }
    }

    jump() {
        if (!this.isJumping && !this.isSliding) {
            this.isJumping = true;
            this.velocityY = 8;
            audio.jump();
        }
    }

    slide() {
        if (!this.isSliding && !this.isJumping) {
            this.isSliding = true;
            this.slideTimer = 0.8;
            audio.slide();
        }
    }

    update(dt, speed) {
        // Horizontal Lerp
        this.group.position.x += (this.targetX - this.group.position.x) * 15 * dt;
        
        // Jump Physics
        if (this.isJumping) {
            this.velocityY -= 25 * dt; // Gravity
            this.currentY += this.velocityY * dt;
            
            if (this.currentY <= 0) {
                this.currentY = 0;
                this.isJumping = false;
                this.velocityY = 0;
            }
        }
        this.group.position.y = this.currentY;

        // Slide logic
        if (this.isSliding) {
            this.slideTimer -= dt;
            this.torso.rotation.x = THREE.MathUtils.lerp(this.torso.rotation.x, -1.2, 15 * dt);
            this.torso.position.y = THREE.MathUtils.lerp(this.torso.position.y, 0.5, 15 * dt);
            
            if (this.slideTimer <= 0) {
                this.isSliding = false;
            }
        } else {
            this.torso.rotation.x = THREE.MathUtils.lerp(this.torso.rotation.x, 0, 15 * dt);
            this.torso.position.y = THREE.MathUtils.lerp(this.torso.position.y, 1.1, 15 * dt);
        }

        // Run Animation
        if (!this.isSliding) {
            this.runTime += dt * speed * 0.5;
            const swing = Math.sin(this.runTime) * 0.8;
            const swingOpp = Math.sin(this.runTime + Math.PI) * 0.8;
            
            if (this.isJumping) {
                // Jump pose
                this.leftArm.rotation.x = THREE.MathUtils.lerp(this.leftArm.rotation.x, -2, 10*dt);
                this.rightArm.rotation.x = THREE.MathUtils.lerp(this.rightArm.rotation.x, -2, 10*dt);
                this.leftLeg.rotation.x = THREE.MathUtils.lerp(this.leftLeg.rotation.x, 1, 10*dt);
                this.rightLeg.rotation.x = THREE.MathUtils.lerp(this.rightLeg.rotation.x, 0.5, 10*dt);
            } else {
                // Run pose
                this.leftArm.rotation.x = swing;
                this.rightArm.rotation.x = swingOpp;
                this.leftLeg.rotation.x = swingOpp;
                this.rightLeg.rotation.x = swing;
                this.torso.position.y = 1.1 + Math.abs(Math.sin(this.runTime * 2)) * 0.05;
            }
        } else {
            // Slide pose
            this.leftArm.rotation.x = THREE.MathUtils.lerp(this.leftArm.rotation.x, 2, 10*dt);
            this.rightArm.rotation.x = THREE.MathUtils.lerp(this.rightArm.rotation.x, 2, 10*dt);
            this.leftLeg.rotation.x = THREE.MathUtils.lerp(this.leftLeg.rotation.x, 1.5, 10*dt);
            this.rightLeg.rotation.x = THREE.MathUtils.lerp(this.rightLeg.rotation.x, 1.5, 10*dt);
        }
    }
}

// ==========================================
// 5. WORLD & OBSTACLES (Pooling)
// ==========================================
class World {
    constructor(scene) {
        this.scene = scene;
        this.pool = { tea: [], vans: [], barriers: [], decor: [] };
        this.active = { tea: [], vans: [], barriers: [], decor: [] };
        
        this.buildRoad();
        this.initPools();
    }

    buildRoad() {
        // Asphalt
        const roadGeo = new THREE.PlaneGeometry(10, 400);
        const roadMat = new THREE.MeshStandardMaterial({ color: COLORS.asphalt, roughness: 0.2, metalness: 0.1 });
        this.road = new THREE.Mesh(roadGeo, roadMat);
        this.road.rotation.x = -Math.PI / 2;
        this.road.position.z = -150;
        this.scene.add(this.road);

        // Lane Lines
        const lineGeo = new THREE.PlaneGeometry(0.15, 400);
        const lineMat = new THREE.MeshBasicMaterial({ color: COLORS.roadLine });
        
        const line1 = new THREE.Mesh(lineGeo, lineMat);
        line1.rotation.x = -Math.PI / 2;
        line1.position.set(-LANE_WIDTH/2, 0.01, -150);
        this.scene.add(line1);

        const line2 = new THREE.Mesh(lineGeo, lineMat);
        line2.rotation.x = -Math.PI / 2;
        line2.position.set(LANE_WIDTH/2, 0.01, -150);
        this.scene.add(line2);

        // Distant City Silhouettes
        const cityGeo = new THREE.BoxGeometry(5, 20, 5);
        const cityMat = new THREE.MeshStandardMaterial({ color: COLORS.bgDarker, roughness: 1 });
        for (let i = 0; i < 20; i++) {
            const building = new THREE.Mesh(cityGeo, cityMat);
            const side = Math.random() > 0.5 ? 1 : -1;
            building.position.set(side * (15 + Math.random() * 20), 10 + Math.random() * 10, -Math.random() * 200 - 50);
            building.scale.set(1 + Math.random(), 1 + Math.random(), 1);
            
            // Add some windows
            const windowMat = new THREE.MeshBasicMaterial({ color: COLORS.lightWarm });
            for(let j=0; j<3; j++){
                const win = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.5), windowMat);
                win.position.set(0, Math.random()*10 - 5, 2.51);
                building.add(win);
            }
            this.scene.add(building);
        }
    }

    initPools() {
        // Tea
        const teaGeo = new THREE.BoxGeometry(0.3, 0.5, 0.1);
        const teaMat = new THREE.MeshStandardMaterial({ color: COLORS.teaGreen, emissive: COLORS.teaGreen, emissiveIntensity: 0.5 });
        for (let i = 0; i < 30; i++) {
            const t = new THREE.Mesh(teaGeo, teaMat);
            t.visible = false;
            this.scene.add(t);
            this.pool.tea.push(t);
        }

        // Vans (Police)
        const vanGroup = new THREE.Group();
        const bodyGeo = new THREE.BoxGeometry(1.8, 1.8, 3.5);
        const bodyMat = new THREE.MeshStandardMaterial({ color: 0xE8EEF7, roughness: 0.8 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.9;
        vanGroup.add(body);
        
        const windowGeo = new THREE.BoxGeometry(1.6, 0.6, 0.1);
        const windowMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2 });
        const winFront = new THREE.Mesh(windowGeo, windowMat);
        winFront.position.set(0, 1.4, 1.76);
        vanGroup.add(winFront);

        // Flashing Lights
        const lightBlueMat = new THREE.MeshBasicMaterial({ color: COLORS.policeBlue });
        const lightRedMat = new THREE.MeshBasicMaterial({ color: COLORS.policeRed });
        
        const light1 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.3), lightBlueMat);
        light1.position.set(0.4, 1.9, 0.5);
        light1.name = 'policeLightBlue';
        vanGroup.add(light1);

        const light2 = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.1, 0.3), lightRedMat);
        light2.position.set(-0.4, 1.9, 0.5);
        light2.name = 'policeLightRed';
        vanGroup.add(light2);

        for (let i = 0; i < 5; i++) {
            const v = vanGroup.clone();
            v.userData.lightBlue = v.getObjectByName('policeLightBlue');
            v.userData.lightRed = v.getObjectByName('policeLightRed');
            v.visible = false;
            this.scene.add(v);
            this.pool.vans.push(v);
        }

        // Barriers
        const barrierGeo = new THREE.BoxGeometry(2, 1, 0.5);
        const barrierMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.9 });
        for (let i = 0; i < 5; i++) {
            const b = new THREE.Mesh(barrierGeo, barrierMat);
            b.visible = false;
            this.scene.add(b);
            this.pool.barriers.push(b);
        }
    }

    spawn(type, lane, zPos) {
        let obj = null;
        if (type === 'tea' && this.pool.tea.length > 0) {
            obj = this.pool.tea.pop();
        } else if (type === 'van' && this.pool.vans.length > 0) {
            obj = this.pool.vans.pop();
        } else if (type === 'barrier' && this.pool.barriers.length > 0) {
            obj = this.pool.barriers.pop();
        }

        if (obj) {
            obj.visible = true;
            obj.position.set((lane - 1) * LANE_WIDTH, type === 'tea' ? 1 : 0, zPos);
            obj.userData.lane = lane;
            obj.userData.type = type;
            this.active[type === 'tea' ? 'tea' : (type === 'van' ? 'vans' : 'barriers')].push(obj);
        }
    }

    update(dt, speed, playerZ) {
        const moveAmount = speed * dt;
        
        // Move active objects
        for (const key in this.active) {
            const arr = this.active[key];
            for (let i = arr.length - 1; i >= 0; i--) {
                const obj = arr[i];
                obj.position.z += moveAmount;

                // Animate Tea
                if (key === 'tea') {
                    obj.rotation.y += 3 * dt;
                    obj.position.y = 1 + Math.sin(Date.now() * 0.005 + obj.position.z) * 0.2;
                }

                // Animate Van Lights
                if (key === 'vans') {
                    const blink = Math.sin(Date.now() * 0.01) > 0;
                    obj.userData.lightBlue.visible = blink;
                    obj.userData.lightRed.visible = !blink;
                }

                // Recycle if behind camera
                if (obj.position.z > 10) {
                    obj.visible = false;
                    this.pool[key].push(obj);
                    arr.splice(i, 1);
                }
            }
        }
    }

    reset() {
        for (const key in this.active) {
            const arr = this.active[key];
            while (arr.length > 0) {
                const obj = arr.pop();
                obj.visible = false;
                this.pool[key].push(obj);
            }
        }
    }
}

// ==========================================
// 6. UI MANAGER
// ==========================================
class UIManager {
    constructor(game) {
        this.game = game;
        this.elements = {
            menu: document.getElementById('menu'),
            hud: document.getElementById('hud'),
            shop: document.getElementById('shop'),
            gameover: document.getElementById('gameover'),
            score: document.getElementById('score-val'),
            tea: document.getElementById('tea-val'),
            goScore: document.getElementById('go-score'),
            goTea: document.getElementById('go-tea'),
            goHighscore: document.getElementById('go-highscore'),
            menuHighscore: document.getElementById('menu-highscore'),
            menuTea: document.getElementById('menu-tea-balance'),
            shopTea: document.getElementById('shop-tea-balance'),
            hint: document.getElementById('control-hint')
        };

        this.saveData = this.loadData();
        this.initEvents();
        this.buildShopUI();
        this.updateMenuStats();
        this.checkDeviceHint();
    }

    loadData() {
        const defaultData = {
            tea: 0,
            highscore: 0,
            unlockedSweaters: ['s_grey', 's_blue'],
            unlockedSneakers: ['sn_white', 'sn_black'],
            currentSweater: 's_grey',
            currentSneaker: 'sn_white'
        };
        try {
            const saved = localStorage.getItem('saf_surf_save');
            return saved ? { ...defaultData, ...JSON.parse(saved) } : defaultData;
        } catch (error) {
            console.warn('Не удалось прочитать сохранение SAF SURF:', error);
            return defaultData;
        }
    }

    persistData() {
        localStorage.setItem('saf_surf_save', JSON.stringify(this.saveData));
    }

    checkDeviceHint() {
        const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
        this.elements.hint.textContent = isTouch ? 'Свайпай влево/вправо, вверх — прыжок' : 'Управление: Стрелки / WASD / Space';
    }

    updateMenuStats() {
        this.elements.menuHighscore.textContent = this.saveData.highscore;
        this.elements.menuTea.textContent = this.saveData.tea;
    }

    showMenu() {
        this.game.state = 'MENU';
        this.elements.hud.classList.add('hidden');
        this.elements.gameover.classList.add('hidden');
        this.elements.shop.classList.add('hidden');
        this.elements.menu.classList.remove('hidden');
        this.updateMenuStats();
        
        // Update character in menu
        const sw = SWEATER_COLORS.find(c => c.id === this.saveData.currentSweater).color;
        const sn = SNEAKER_COLORS.find(c => c.id === this.saveData.currentSneaker).color;
        this.game.player.setColors(sw, sn);
        this.game.player.group.position.set(0, 0, 0);
    }

    showGame() {
        this.game.state = 'PLAYING';
        this.elements.menu.classList.add('hidden');
        this.elements.gameover.classList.add('hidden');
        this.elements.hud.classList.remove('hidden');
    }

    showGameOver(score, tea) {
        this.game.state = 'GAMEOVER';
        this.elements.hud.classList.add('hidden');
        this.elements.gameover.classList.remove('hidden');
        this.elements.goScore.textContent = Math.floor(score);
        this.elements.goTea.textContent = tea;
        
        if (score > this.saveData.highscore) {
            this.saveData.highscore = Math.floor(score);
        }
        this.saveData.tea += tea;
        this.persistData();
        
        this.elements.goHighscore.textContent = this.saveData.highscore;
    }

    showShop() {
        this.game.state = 'SHOP';
        this.elements.menu.classList.add('hidden');
        this.elements.shop.classList.remove('hidden');
        this.elements.shopTea.textContent = this.saveData.tea;
        this.updateShopUI();
    }

    initEvents() {
        document.getElementById('btn-play').addEventListener('click', () => {
            audio.init();
            this.showGame();
            this.game.startRun();
        });
        document.getElementById('btn-shop').addEventListener('click', () => this.showShop());
        document.getElementById('btn-shop-back').addEventListener('click', () => this.showMenu());
        document.getElementById('btn-restart').addEventListener('click', () => {
            this.showGame();
            this.game.startRun();
        });
        document.getElementById('btn-menu').addEventListener('click', () => this.showMenu());
    }

    buildShopUI() {
        const swContainer = document.getElementById('shop-sweaters');
        const snContainer = document.getElementById('shop-sneakers');

        const createColorBtn = (item, type) => {
            const btn = document.createElement('button');
            btn.className = 'color-btn';
            btn.style.backgroundColor = '#' + item.color.toString(16).padStart(6, '0');
            btn.dataset.id = item.id;
            btn.dataset.type = type;
            btn.dataset.price = item.price;
            
            btn.addEventListener('click', () => this.handleBuySelect(item, type, btn));
            return btn;
        };

        SWEATER_COLORS.forEach(item => swContainer.appendChild(createColorBtn(item, 'sweater')));
        SNEAKER_COLORS.forEach(item => snContainer.appendChild(createColorBtn(item, 'sneaker')));
    }

    updateShopUI() {
        const btns = document.querySelectorAll('.color-btn');
        btns.forEach(btn => {
            const type = btn.dataset.type;
            const id = btn.dataset.id;
            const price = parseInt(btn.dataset.price);
            
            const unlockedList = type === 'sweater' ? this.saveData.unlockedSweaters : this.saveData.unlockedSneakers;
            const currentId = type === 'sweater' ? this.saveData.currentSweater : this.saveData.currentSneaker;

            if (unlockedList.includes(id)) {
                btn.classList.remove('locked');
                btn.textContent = '';
                if (id === currentId) btn.classList.add('selected');
                else btn.classList.remove('selected');
            } else {
                btn.classList.add('locked');
                btn.classList.remove('selected');
                btn.dataset.price = price; // for CSS content
            }
        });
    }

    handleBuySelect(item, type, btn) {
        audio.init();
        const unlockedList = type === 'sweater' ? this.saveData.unlockedSweaters : this.saveData.unlockedSneakers;
        const isUnlocked = unlockedList.includes(item.id);

        if (isUnlocked) {
            if (type === 'sweater') this.saveData.currentSweater = item.id;
            else this.saveData.currentSneaker = item.id;
            
            // Apply to player
            const sw = SWEATER_COLORS.find(c => c.id === this.saveData.currentSweater).color;
            const sn = SNEAKER_COLORS.find(c => c.id === this.saveData.currentSneaker).color;
            this.game.player.setColors(sw, sn);
            
            this.persistData();
            this.updateShopUI();
        } else {
            if (this.saveData.tea >= item.price) {
                this.saveData.tea -= item.price;
                unlockedList.push(item.id);
                
                if (type === 'sweater') this.saveData.currentSweater = item.id;
                else this.saveData.currentSneaker = item.id;

                this.persistData();
                this.elements.shopTea.textContent = this.saveData.tea;
                this.updateShopUI();
                audio.buy();
            } else {
                // Shake animation for not enough tea
                btn.style.transform = 'translateX(5px)';
                setTimeout(() => btn.style.transform = 'translateX(-5px)', 50);
                setTimeout(() => btn.style.transform = 'translateX(5px)', 100);
                setTimeout(() => btn.style.transform = 'translateX(0)', 150);
            }
        }
    }

    updateHUD(score, tea) {
        this.elements.score.textContent = Math.floor(score);
        this.elements.tea.textContent = tea;
    }
}

// ==========================================
// 7. MAIN GAME CLASS
// ==========================================
class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: "high-performance" });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = false; // Fake shadows for performance

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(COLORS.bgDark);
        this.scene.fog = new THREE.FogExp2(COLORS.bgDark, 0.015);

        this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(0, 5, 8);
        this.camera.lookAt(0, 1, -10);

        this.setupLights();

        // Game Objects
        this.world = new World(this.scene);
        this.player = new Player(this.scene);
        this.ui = new UIManager(this);
        this.input = new InputManager(this);

        // State
        this.state = 'MENU';
        this.speed = SPEED_INITIAL;
        this.score = 0;
        this.teaCollected = 0;
        this.spawnTimer = 0;
        this.activeTeaCount = 0;

        // Fixed timestep
        this.lastTime = performance.now();
        this.accumulator = 0;
        this.dt = 1 / 60;

        this.handleResize();
        window.addEventListener('resize', () => this.handleResize());

        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    setupLights() {
        const ambient = new THREE.AmbientLight(COLORS.bgDarker, 0.8);
        this.scene.add(ambient);

        const moonLight = new THREE.DirectionalLight(COLORS.lightCold, 1.5);
        moonLight.position.set(-5, 10, 5);
        this.scene.add(moonLight);

        // Warm street lights (fake point lights)
        const warmLight1 = new THREE.PointLight(COLORS.lightWarm, 20, 15);
        warmLight1.position.set(0, 8, 0);
        this.scene.add(warmLight1);
    }

    handleResize() {
        const width = this.canvas.clientWidth || window.innerWidth;
        const height = this.canvas.clientHeight || window.innerHeight;
        
        this.renderer.setSize(width, height);
        this.camera.aspect = width / height;
        
        // Responsive FOV and Camera position
        if (this.camera.aspect < 0.8) {
            // Mobile portrait
            this.camera.fov = 75;
            this.camera.position.set(0, 6, 9);
        } else {
            // Desktop
            this.camera.fov = 60;
            this.camera.position.set(0, 5, 8);
        }
        
        this.camera.updateProjectionMatrix();
    }

    startRun() {
        this.speed = SPEED_INITIAL;
        this.score = 0;
        this.teaCollected = 0;
        this.spawnTimer = 0;
        this.activeTeaCount = 0;
        
        this.player.group.position.set(0, 0, 0);
        this.player.laneIndex = 1;
        this.player.targetX = 0;
        this.player.isJumping = false;
        this.player.isSliding = false;
        this.player.currentY = 0;
        
        this.world.reset();
        this.ui.updateHUD(this.score, this.teaCollected);
    }

    spawnLogic(dt) {
        this.spawnTimer -= dt;
        
        if (this.spawnTimer <= 0) {
            // Determine what to spawn
            const rand = Math.random();
            
            // Spawn obstacles
            if (rand > 0.6) {
                const type = Math.random() > 0.5 ? 'van' : 'barrier';
                const blockedLane = Math.floor(Math.random() * 3);
                
                // Ensure at least one lane is free
                this.world.spawn(type, blockedLane, -100);
                
                // Sometimes block a second lane, but never all 3
                if (Math.random() > 0.7) {
                    let secondLane = (blockedLane + 1) % 3;
                    this.world.spawn(type, secondLane, -100);
                }
            }
            
            // Spawn tea
            if (rand < 0.4 || Math.random() > 0.8) {
                const teaLane = Math.floor(Math.random() * 3);
                const count = 3 + Math.floor(Math.random() * 4);
                for (let i = 0; i < count; i++) {
                    this.world.spawn('tea', teaLane, -100 - (i * 2));
                }
            }
            
            this.spawnTimer = 1.0 + Math.random() * 1.5;
        }
    }

    checkCollisions() {
        const playerZ = 0;
        const playerLane = this.player.laneIndex;
        const isJumping = this.player.currentY > 0.5;
        const isSliding = this.player.isSliding;

        // Check Vans & Barriers
        const obstacles = [...this.world.active.vans, ...this.world.active.barriers];
        for (const obs of obstacles) {
            if (Math.abs(obs.position.z - playerZ) < 1.5 && obs.userData.lane === playerLane) {
                // Jump over barriers (low)
                if (obs.userData.type === 'barrier' && isJumping) continue;
                // Slide under vans? Actually vans are tall, so jumping over them fails.
                // If sliding under a van, still crash (vans are solid). 
                
                // CRASH
                this.crash();
                return;
            }
        }

        // Check Tea
        for (let i = this.world.active.tea.length - 1; i >= 0; i--) {
            const tea = this.world.active.tea[i];
            if (Math.abs(tea.position.z - playerZ) < 1.0 && tea.userData.lane === playerLane) {
                // Collect
                tea.visible = false;
                this.world.pool.tea.push(tea);
                this.world.active.tea.splice(i, 1);
                
                this.teaCollected++;
                this.score += 10;
                audio.collect();
                this.ui.updateHUD(this.score, this.teaCollected);
            }
        }
    }

    crash() {
        audio.crash();
        this.state = 'GAMEOVER_PAUSE';
        
        // Screen shake
        let shakeIntensity = 0.5;
        const shakeInterval = setInterval(() => {
            this.camera.position.x = (Math.random() - 0.5) * shakeIntensity;
            this.camera.position.y = 5 + (Math.random() - 0.5) * shakeIntensity;
            shakeIntensity *= 0.9;
            if (shakeIntensity < 0.05) {
                clearInterval(shakeInterval);
                this.camera.position.x = 0;
                this.camera.position.y = 5;
                this.ui.showGameOver(this.score, this.teaCollected);
            }
        }, 16);
    }

    update(dt) {
        if (this.state === 'PLAYING') {
            // Speed up
            if (this.speed < SPEED_MAX) {
                this.speed += 0.1 * dt;
            }

            this.player.update(dt, this.speed);
            this.world.update(dt, this.speed, 0);
            this.spawnLogic(dt);
            this.checkCollisions();

            // Score by distance
            this.score += this.speed * dt * 2;
            this.ui.updateHUD(this.score, this.teaCollected);

            // Camera follow and FOV kick
            this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, 8 + (this.speed - SPEED_INITIAL) * 0.05, 5 * dt);
            this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, this.player.group.position.x * 0.5, 5 * dt);
            
            const targetFov = (this.camera.aspect < 0.8 ? 75 : 60) + (this.speed - SPEED_INITIAL) * 0.5;
            this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, 5 * dt);
            this.camera.updateProjectionMatrix();
        } else if (this.state === 'MENU') {
            // Rotate player in menu
            this.player.group.rotation.y += dt;
            this.player.update(dt, 1); // Idle animation
        }
    }

    animate(time) {
        requestAnimationFrame(this.animate);

        const deltaTime = (time - this.lastTime) / 1000;
        this.lastTime = time;

        // Fixed timestep accumulator
        this.accumulator += deltaTime;
        while (this.accumulator >= this.dt) {
            this.update(this.dt);
            this.accumulator -= this.dt;
        }

        this.renderer.render(this.scene, this.camera);
    }
}

// Start Game
window.addEventListener('DOMContentLoaded', () => {
    new Game();
});
