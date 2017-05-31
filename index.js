/*
# nomad

This is a clone of the Google Chrome dinosaur game clone, 
developed by [Chromium](https://cs.chromium.org/chromium/src/components/neterror/resources/offline.js?q=t-rex+package:%5Echromium$&dr=C&l=7).

### Gameplay

The main character is a nomad in the desert, looking for a new home. He must dodge rocks and birds in order to survive. 
This game is infinite, and the speed gets faster exponentially. The stones and birds will be randomly generated.

**Moves**:

* Spacebar/UP arrow: START/JUMP
* DOWN arrow: DUCK

### System Requirements

This will run on Google Chrome, with JavaScript enabled. Please open `index.html` to get started.


*/


(function () {
    'use strict';
    
    // class for the whole gameplay
    function Nomad(outerContainerId, optional_custom) {
        
        if (Nomad.instance_) {
            return Nomad.instance_;
        }
        
        //ninit the singleton instance
        Nomad.instance_ = this;

        // layout Details
        this.outerCont = document.querySelector(outerContainerId);
        this.container1 = null;
        this.snackbar1 = null;
        this.detailsButton = this.outerCont.querySelector('#details-button');

        this.values = optional_custom || Nomad.values;

        this.defaultSizes = Nomad.defaultSizes;

        this.canvas = null;
        this.canvasContainer = null;

        this.Blocks = [];

        // nomad character
        this.boy = null;

        // time and distance details
        this.distanceMeasure = null;
        this.distanceRan = 0;

        this.time = 0;
        this.runningTime = 0;
        this.secPerFrame = 1000 / FPS;
        this.curSpeed = this.values.SPEED;

        // score
        this.hiScore = 0;

    
        // game states
        this.activated = false; 
        this.playing = false; // Whether the game is currently in play state.
        this.crashed = false;// whether the game has crashe
        this.paused = false;
        this.inverted = false;
        this.invertTimer = 0;
        this.resizeTimerID2 = null;

        this.gameCtr = 0;

        // MEDIA
        this.audioBuffer = null;
        this.soundFx = {};
        this.audio_context = null;
        this.images = {};
        this.imagesLoaded = 0;

        if (this.isDisabled()) {
            this.setupDisabledNomad();
        } else {
            this.loadImg();
        }
    }

    window['Nomad'] = Nomad;

    var DEFAULTWIDTH = 600;
    var FPS = 60;
    var IS_HIDPI = window.devicePixelRatio > 1;


    /**
    States:
    0 start state
    1 jump state
    2 walking state
    3 slide down state
    4 final state

    Inputs:
    1 spacebar/up
    2 down
    3 do nothing
    4 hit
    **/

    var logic = [
        [1, 0, 0, 0],
        [1, 3, 2, 4],
        [1, 3, 2, 4],
        [1, 3, 2, 4],
        [4, 4, 4, 4]
    ];

    // contants and factors in the game
    Nomad.values = {
        ACCELERATION: 0.001,
        BG_CLOUD_SPEED: 0.2,
        BOTTOM_PAD: 10,
        CLEAR_TIME: 3000,
        CLOUD_FREQ: 0.5,
        GAMEOVER_CLEAR_TIME: 750,
        SPACEFACTOR: 0.6,
        GRAVITY: 0.6,
        FIRST_JUMP_VELOCITY: 12,
        INVERT_FADE_DURATION: 12000,
        INVERT_DISTANCE: 700,
        MAX_BLINK_COUNT: 3,
        MAX_CLOUDS: 6,
        MAX_Box_LENGTH: 3,
        MAX_BLOCK_DUPLICATION: 2,
        MAX_SPEED: 13,
        MIN_JUMP_HEIGHT: 35,
        RESOURCE_TEMPLATE_ID: 'audio-resources',
        SPEED: 6,
        SPEED_DROP_COEFFICIENT: 3
    };

    Nomad.defaultSizes = {
        WIDTH: DEFAULTWIDTH,
        HEIGHT: 150
    };

    // CSS STUFF
    Nomad.classes = {
        CANVAS: 'Nomad-canvas',
        CONTAINER: 'Nomad-container',
        CRASHED: 'crashed',
        ICON: 'icon-offline',
        INVERTED: 'inverted',
        SNACKBAR: 'snackbar',
        SNACKBAR_SHOW: 'snackbar-show'
    };


    // sprite coordinates
    Nomad.spriteCoordinates = {
        LDPI: { // for 100%
            BLOCK_LARGE: { x: 332, y: 2 },
            BLOCK_SMALL: { x: 228, y: 2 },
            CLOUD: { x: 86, y: 2 },
            HORIZON: { x: 2, y: 54 },
            DUCK: { x: 134, y: 2 },
            RESTART: { x: 2, y: 2 },
            TEXT_SPRITE: { x: 655, y: 2 },
            BOY: { x: 848, y: 2 }
        },
        HDPI: { //  for 200% zoom
            BLOCK_LARGE: { x: 652, y: 2 },
            BLOCK_SMALL: { x: 446, y: 2 },
            CLOUD: { x: 166, y: 2 },
            HORIZON: { x: 2, y: 104 },
            DUCK: { x: 260, y: 2 },
            RESTART: { x: 2, y: 2 },
            TEXT_SPRITE: { x: 1294, y: 2 },
            BOY: { x: 1678, y: 2 }
        }
    };

    Nomad.sounds = {
        BUTTON_PRESS: 'offline-sound-press',
        HIT: 'offline-sound-hit',
        SCORE: 'offline-sound-reached'
    };

    Nomad.keyActions = {
        JUMP: { '38': 1, '32': 1 },  // Up, spacebar
        DUCK: { '40': 1 },  // Down
        RESTART: { '13': 1 }  // Enter
    };

    Nomad.events = {
        ANIM_END: 'webkitAnimationEnd',
        CLICK: 'click',
        KEYDOWN: 'keydown',
        KEYUP: 'keyup',
        MOUSEDOWN: 'mousedown',
        MOUSEUP: 'mouseup',
        RESIZE: 'resize',
        VISIBILITY: 'visibilitychange',
        BLUR: 'blur',
        FOCUS: 'focus',
        LOAD: 'load'
    };


    Nomad.prototype = {

        isDisabled: function () {
            return false;
        },

        loadImg: function () {
            if (IS_HIDPI) {
                Nomad.imgSprite = document.getElementById('offline-resources-2x');
                this.spriteDef = Nomad.spriteCoordinates.HDPI;
            } else {
                Nomad.imgSprite = document.getElementById('offline-resources-1x');
                this.spriteDef = Nomad.spriteCoordinates.LDPI;
            }

            if (Nomad.imgSprite.complete) {
                this.init();
            } else {
                // If the images are not yet loaded, add a listener.
                Nomad.imgSprite.addEventListener(Nomad.events.LOAD,
                    this.init.bind(this));
            }
        },

        // BASE64 AUDIO TO ARRAY BUFFER FOR THE AUDIO
        loadAudio: function () {
           
                this.audio_context = new AudioContext();
                var resourceTemplate =
                    document.getElementById(this.values.RESOURCE_TEMPLATE_ID).content;
                for (var sound in Nomad.sounds) {
                    var soundSrc =
                        resourceTemplate.getElementById(Nomad.sounds[sound]).src;
                    soundSrc = soundSrc.substr(soundSrc.indexOf(',') + 1);
                    var buffer = audioToArrayBuffer(soundSrc);

                    this.audio_context.decodeAudioData(buffer, function (index, audioData) {
                        this.soundFx[index] = audioData;
                    }.bind(this, sound));
                }
       
        },

        setSpeed: function (optionalSpeed) {
            var speed = optionalSpeed || this.curSpeed;

            if (optionalSpeed) {
                this.curSpeed = optionalSpeed;
            }
        },

        init: function () {

            document.querySelector('.' + Nomad.classes.ICON).style.visibility =
                'hidden';

            this.setSpeed();

            this.container1 = document.createElement('div');
            this.container1.className = Nomad.classes.CONTAINER;

            this.canvas = inflateCanvas(this.container1, this.defaultSizes.WIDTH,
                this.defaultSizes.HEIGHT, Nomad.classes.PLAYER);

            this.canvasContainer = this.canvas.getContext('2d');
            this.canvasContainer.fillStyle = '#f8f8f8';
            this.canvasContainer.fill();
            Nomad.updateScreenScaling(this.canvas);

            this.horizon = new Space(this.canvas, this.spriteDef, this.defaultSizes,
                this.values.SPACEFACTOR);

            this.distanceMeasure = new distanceCalc(this.canvas,
                this.spriteDef.TEXT_SPRITE, this.defaultSizes.WIDTH);

            this.boy = new Boy(this.canvas, this.spriteDef.BOY);

            this.outerCont.appendChild(this.container1);

            this.startListeners();
            this.update();

        },


        gameIntro: function () {
            if (!this.activated && !this.crashed) {
                this.intro = true;
                this.boy.intro = true;

                // CSS animation definition.
                var keyframes = '@-webkit-keyframes intro { ' +
                    'from { width:' + Boy.values.WIDTH + 'px }' +
                    'to { width: ' + this.defaultSizes.WIDTH + 'px }' +
                    '}';
                document.styleSheets[0].insertRule(keyframes, 0);

                this.container1.addEventListener(Nomad.events.ANIM_END,
                    this.startGame.bind(this));

                this.container1.style.webkitAnimation = 'intro .4s ease-out 1 both';
                this.container1.style.width = this.defaultSizes.WIDTH + 'px';

                this.playing = true;
                this.activated = true;
            } else if (this.crashed) {
                this.restart();
            }
        },

        startGame: function () {
            this.runningTime = 0;
            this.intro = false;
            this.boy.intro = false;
            this.container1.style.webkitAnimation = '';
            this.gameCtr++;

            document.addEventListener(Nomad.events.VISIBILITY,
                this.onVisibilityChange.bind(this));

            window.addEventListener(Nomad.events.BLUR,
                this.onVisibilityChange.bind(this));

            window.addEventListener(Nomad.events.FOCUS,
                this.onVisibilityChange.bind(this));
        },

        clearScreen: function () {
            this.canvasContainer.clearRect(0, 0, this.defaultSizes.WIDTH,
                this.defaultSizes.HEIGHT);
        },

     
        update: function () {
            this.updatePending = false;

            var now = getCurrTime();
            var deltaTime = now - (this.time || now);
            this.time = now;

            if (this.playing) {
                this.clearScreen();

                if (this.boy.isJump) {
                    this.boy.updateJump(deltaTime);
                }

                this.runningTime += deltaTime;
                var hasBlocks = this.runningTime > this.values.CLEAR_TIME;

                // if first click, then start the intro
                if (this.boy.jumpCtr == 1 && !this.intro) {
                    this.gameIntro();
                }

                // trigger update
                if (this.intro) {
                    this.horizon.update(0, this.curSpeed, hasBlocks);
                } else {
                    deltaTime = !this.activated ? 0 : deltaTime;
                    this.horizon.update(deltaTime, this.curSpeed, hasBlocks,
                        this.inverted);
                }

                // check for any hits or collisions
                var collision = hasBlocks &&
                    checkForHit(this.horizon.Blocks[0], this.boy);

                if (!collision) {
                    this.distanceRan += this.curSpeed * deltaTime / this.secPerFrame;

                    if (this.curSpeed < this.values.MAX_SPEED) {
                        this.curSpeed += this.values.ACCELERATION;
                    }
                } else {
                    this.gameOver();
                }

                var playAchievementSound = this.distanceMeasure.update(deltaTime,
                    Math.ceil(this.distanceRan));
                if (playAchievementSound) {
                    this.playSound(this.soundFx.SCORE);
                }
            }

            // trigger update
            if (this.playing || (!this.activated &&
                this.boy.blinkCount < Nomad.values.MAX_BLINK_COUNT)) {
                this.boy.update(deltaTime);
                this.schedUpdate();
            }
        },

        handleEvent: function (e) {
            return (function (evtType, events) {
                switch (evtType) {
                    case events.KEYDOWN:
                    case events.MOUSEDOWN:
                        this.onDownPress(e);
                        break;
                    case events.KEYUP:
                    case events.MOUSEUP:
                        this.onUpPress(e);
                        break;
                }
            }.bind(this))(e.type, Nomad.events);
        },

        // LISTENERS
        startListeners: function () {
            document.addEventListener(Nomad.events.KEYDOWN, this);
            document.addEventListener(Nomad.events.KEYUP, this);
            document.addEventListener(Nomad.events.MOUSEDOWN, this);
            document.addEventListener(Nomad.events.MOUSEUP, this);
        },
        stopListeners: function () {
            document.removeEventListener(Nomad.events.KEYDOWN, this);
            document.removeEventListener(Nomad.events.KEYUP, this);
            document.removeEventListener(Nomad.events.MOUSEDOWN, this);
            document.removeEventListener(Nomad.events.MOUSEUP, this);
        },

        // STATE CHANGES
        onDownPress: function (e) {
            if (e.target != this.detailsButton) {
                if (!this.crashed && (Nomad.keyActions.JUMP[e.keyCode])) {
                    if (!this.playing) {
                        this.loadAudio();
                        this.playing = true;
                        this.update();
                        if (window.errorPageController) {
                            errorPageController.trackEasterEgg();
                        }
                    }
                    //  Play sound effect and jump on starting the game for the first time.
                    if (!this.boy.isJump && !this.boy.isDuck) {
                        this.playSound(this.soundFx.BUTTON_PRESS);
                        this.boy.startJump(this.curSpeed);
                    }
                }

                if (this.crashed &&
                    e.currentTarget == this.container1) {
                    this.restart();
                }
            }

            if (this.playing && !this.crashed && Nomad.keyActions.DUCK[e.keyCode]) {
                e.preventDefault();
                if (this.boy.isJump) {
                    // Speed drop, activated only when jump key is not pressed.
                    this.boy.setDropSpeed();
                } else if (!this.boy.isJump && !this.boy.isDuck) {
                    // Duck.
                    this.boy.setDuck(true);
                }
            }
        },



        onUpPress: function (e) {
            var keyCode = String(e.keyCode);
            var isjumpKey = Nomad.keyActions.JUMP[keyCode] ||
                e.type == Nomad.events.MOUSEDOWN;

            if (this.isRunning() && isjumpKey) {
                this.boy.endJump();
            } else if (Nomad.keyActions.DUCK[keyCode]) {
                this.boy.speedDrop = false;
                this.boy.setDuck(false);
            } else if (this.crashed) {
                var deltaTime = getCurrTime() - this.time;

                if (Nomad.keyActions.RESTART[keyCode] ||
                    (deltaTime >= this.values.GAMEOVER_CLEAR_TIME &&
                        Nomad.keyActions.JUMP[keyCode])) {
                    this.restart();
                }
            } else if (this.paused && isjumpKey) {
                // Reset the jump state
                this.boy.reset();
                this.play();
            }
        },
        schedUpdate: function () {
            if (!this.updatePending) {
                this.updatePending = true;
                this.raqId = requestAnimationFrame(this.update.bind(this));
            }
        },

        isRunning: function () {
            return !!this.raqId;
        },

        // triggered during collisions/hits
        gameOver: function () {
            this.playSound(this.soundFx.HIT);

            this.stop();
            this.crashed = true;
            this.distanceMeasure.acheivement = false;

            this.boy.update(100, Boy.status.CRASHED);

            if (!this.GameOverScreen) {
                this.GameOverScreen = new GameOverScreen(this.canvas,
                    this.spriteDef.TEXT_SPRITE, this.spriteDef.RESTART,
                    this.defaultSizes);
            } else {
                this.GameOverScreen.draw();
            }

            if (this.distanceRan > this.hiScore) {
                this.hiScore = Math.ceil(this.distanceRan);
                this.distanceMeasure.setHighScore(this.hiScore);
            }

            this.time = getCurrTime();
        },

        stop: function () {
            this.playing = false;
            this.paused = true;
            cancelAnimationFrame(this.raqId);
            this.raqId = 0;
        },

        play: function () {
            if (!this.crashed) {
                this.playing = true;
                this.paused = false;
                this.boy.update(0, Boy.status.RUNNING);
                this.time = getCurrTime();
                this.update();
            }
        },

        restart: function () {
            if (!this.raqId) {
                this.gameCtr++;
                this.runningTime = 0;
                this.playing = true;
                this.crashed = false;
                this.distanceRan = 0;
                this.setSpeed(this.values.SPEED);
                this.time = getCurrTime();
                this.container1.classList.remove(Nomad.classes.CRASHED);
                this.clearScreen();
                this.distanceMeasure.reset(this.hiScore);
                this.horizon.reset();
                this.boy.reset();
                this.playSound(this.soundFx.BUTTON_PRESS);
                this.invert(true);
                this.update();
            }
        },

        onVisibilityChange: function (e) {
            if (document.hidden || document.webkitHidden || e.type == 'blur' ||
                document.visibilityState != 'visible') {
                this.stop();
            } else if (!this.crashed) {
                this.boy.reset();
                this.play();
            }
        },

      
        playSound: function (soundBuffer) {
            if (soundBuffer) {
                var sourceNode = this.audio_context.createBufferSource();
                sourceNode.buffer = soundBuffer;
                sourceNode.connect(this.audio_context.destination);
                sourceNode.start(0);
            }
        },

    
        invert: function (reset) {
            if (reset) {
                document.body.classList.toggle(Nomad.classes.INVERTED, false);
                this.invertTimer = 0;
                this.inverted = false;
            } else {
                this.inverted = document.body.classList.toggle(Nomad.classes.INVERTED,
                    this.invertTrigger);
            }
        }
    };

    // measure pixel ratios to render best quality
    Nomad.updateScreenScaling = function (canvas, optional_width, optional_height) {
        var context = canvas.getContext('2d');

        var pxRatio = Math.floor(window.devicePixelRatio) || 1;
        var backingStorePxRatio = Math.floor(context.webkitBackingStorePixelRatio) || 1;
        var ratio = pxRatio / backingStorePxRatio;

 
        if (pxRatio !== backingStorePxRatio) {
            var oldWidth = optional_width || canvas.width;
            var oldHeight = optional_height || canvas.height;

            canvas.width = oldWidth * ratio;
            canvas.height = oldHeight * ratio;

            canvas.style.width = oldWidth + 'px';
            canvas.style.height = oldHeight + 'px';
        
            context.scale(ratio, ratio);
            return true;
        } else if (pxRatio == 1) {
       
            canvas.style.width = canvas.width + 'px';
            canvas.style.height = canvas.height + 'px';
        }
        return false;
    };



    function randomNumGen(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // inflator for the game
    function inflateCanvas(container, width, height, opt_classname) {
        var canvas = document.createElement('canvas');
        canvas.className = opt_classname ? Nomad.classes.CANVAS + ' ' +
            opt_classname : Nomad.classes.CANVAS;
        canvas.width = width;
        canvas.height = height;
        container.appendChild(canvas);

        return canvas;
    }


  
    function audioToArrayBuffer(base64String) {
        var len = (base64String.length / 4) * 3;
        var str = atob(base64String);
        var arrayBuffer = new ArrayBuffer(len);
        var bytes = new Uint8Array(arrayBuffer);

        for (var i = 0; i < len; i++) {
            bytes[i] = str.charCodeAt(i);
        }
        return bytes.buffer;
    }

    function getCurrTime() {
        return performance.now();
    }


    // game over screen triggered during collisions
    function GameOverScreen(canvas, textImgPos, restartImgPos, defaultSizes) {
        this.canvas = canvas;
        this.canvasContainer = canvas.getContext('2d');
        this.canvasDimensions = defaultSizes;
        this.textImgPos = textImgPos;
        this.restartImgPos = restartImgPos;
        this.draw();
    };


    GameOverScreen.defaultSizes = {
        TEXT_X: 0,
        TEXT_Y: 13,
        TEXT_WIDTH: 191,
        TEXT_HEIGHT: 11,
        RESTART_WIDTH: 36,
        RESTART_HEIGHT: 32
    };


    GameOverScreen.prototype = {
     
        updateDimensions: function (width, optional_height) {
            this.canvasDimensions.WIDTH = width;
            if (optional_height) {
                this.canvasDimensions.HEIGHT = optional_height;
            }
        },

      
        draw: function () {
            var defaultSizes = GameOverScreen.defaultSizes;

            var centerX = this.canvasDimensions.WIDTH / 2;

         
            var textSrcX = defaultSizes.TEXT_X;
            var textSrcY = defaultSizes.TEXT_Y;
            var textSrcWidth = defaultSizes.TEXT_WIDTH;
            var textSrcHeight = defaultSizes.TEXT_HEIGHT;

            var xTextTarget = Math.round(centerX - (defaultSizes.TEXT_WIDTH / 2));
            var yTextTarget = Math.round((this.canvasDimensions.HEIGHT - 25) / 3);
            var textWidth = defaultSizes.TEXT_WIDTH;
            var textHeight = defaultSizes.TEXT_HEIGHT;

            var restartSrcWidth = defaultSizes.RESTART_WIDTH;
            var restartSrcHeight = defaultSizes.RESTART_HEIGHT;
            var xRestartTarget = centerX - (defaultSizes.RESTART_WIDTH / 2);
            var yRestartTarget = this.canvasDimensions.HEIGHT / 2;

            if (IS_HIDPI) {
                textSrcY *= 2;
                textSrcX *= 2;
                textSrcWidth *= 2;
                textSrcHeight *= 2;
                restartSrcWidth *= 2;
                restartSrcHeight *= 2;
            }

            textSrcX += this.textImgPos.x;
            textSrcY += this.textImgPos.y;

     
            this.canvasContainer.drawImage(Nomad.imgSprite,
                textSrcX, textSrcY, textSrcWidth, textSrcHeight,
                xTextTarget, yTextTarget, textWidth, textHeight);

     
            this.canvasContainer.drawImage(Nomad.imgSprite,
                this.restartImgPos.x, this.restartImgPos.y,
                restartSrcWidth, restartSrcHeight,
                xRestartTarget, yRestartTarget, defaultSizes.RESTART_WIDTH,
                defaultSizes.RESTART_HEIGHT);
        }
    };


    // check for hits or collisions
    function checkForHit(Block, boy, opt_canvasCtx) {
        var BlockBoxXPos = Nomad.defaultSizes.WIDTH + Block.xPos;

        var rBoyBox = new HitBox(
            boy.xPos + 1,
            boy.yPos + 1,
            boy.values.WIDTH - 2,
            boy.values.HEIGHT - 2);

        var BlockBox = new HitBox(
            Block.xPos + 1,
            Block.yPos + 1,
            Block.type_Config.width * Block.size - 2,
            Block.type_Config.height - 2);

     
        if (opt_canvasCtx) {
            drawHitBox(opt_canvasCtx, rBoyBox, BlockBox);
        }

        if (boxCompare(rBoyBox, BlockBox)) {
            var collision_boxes = Block.collision_boxes;
            var rBoyCollisionBoxes = boy.isDuck ?
                Boy.collision_boxes.DUCKING : Boy.collision_boxes.RUNNING;

   
            for (var t = 0; t < rBoyCollisionBoxes.length; t++) {
                for (var i = 0; i < collision_boxes.length; i++) {
                 
                    var adj_BoyBox =
                        adjustHitBox(rBoyCollisionBoxes[t], rBoyBox);
                    var adjBlockBox =
                        adjustHitBox(collision_boxes[i], BlockBox);
                    var crashed = boxCompare(adj_BoyBox, adjBlockBox);

                    if (opt_canvasCtx) {
                        drawHitBox(opt_canvasCtx, adj_BoyBox, adjBlockBox);
                    }

                    if (crashed) {
                        return [adj_BoyBox, adjBlockBox];
                    }
                }
            }
        }
        return false;
    };


    // coordinate adjuster
    function adjustHitBox(box, adjustment) {
        return new HitBox(
            box.x + adjustment.x,
            box.y + adjustment.y,
            box.width,
            box.height);
    };

    // inflater of the hitbox
    function drawHitBox(canvasContainer, rBoyBox, BlockBox) {
        canvasContainer.save();
        canvasContainer.strokeStyle = '#f00';
        canvasContainer.strokeRect(rBoyBox.x, rBoyBox.y, rBoyBox.width, rBoyBox.height);

        canvasContainer.strokeStyle = '#0f0';
        canvasContainer.strokeRect(BlockBox.x, BlockBox.y,
            BlockBox.width, BlockBox.height);
        canvasContainer.restore();
    };

    // coordinate setter
    function HitBox(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.width = w;
        this.height = h;
    };

    // compares any intersection within the boy and the obstacle box
    function boxCompare(rBoyBox, BlockBox) {
        var crashed = false;
        var rBoyBoxX = rBoyBox.x;
        var rBoyBoxY = rBoyBox.y;

        var BlockBoxX = BlockBox.x;
        var BlockBoxY = BlockBox.y;


        if (rBoyBox.x < BlockBoxX + BlockBox.width &&
            rBoyBox.x + rBoyBox.width > BlockBoxX &&
            rBoyBox.y < BlockBox.y + BlockBox.height &&
            rBoyBox.height + rBoyBox.y > BlockBox.y) {
            crashed = true;
        }

        return crashed;
    };


    // Block -- the wrapper of our sprites
    function Block(canvasContainer, type, spriteImgPos, defaultSizes,
        gapCoefficient, speed, opt_xOffset) {

        this.canvasContainer = canvasContainer;
        this.spritePos = spriteImgPos;
        this.type_Config = type;
        this.gapCoefficient = gapCoefficient;
        this.size = randomNumGen(1, Block.MAX_Box_LENGTH);
        this.defaultSizes = defaultSizes;
        this.remove = false;
        this.xPos = defaultSizes.WIDTH + (opt_xOffset || 0);
        this.yPos = 0;
        this.width = 0;
        this.collision_boxes = [];
        this.gap = 0;
        this.speed_Offset = 0;

    
        this.currentFrame = 0;
        this.timer = 0;

        this.init(speed);
    };
    Block.MAX_GAP_FACTOR = 1.5;
    Block.MAX_Box_LENGTH = 3,


        Block.prototype = {
          
            init: function (speed) {
                this.cloneHitBoxes();


                if (this.size > 1 && this.type_Config.multipleSpeed > speed) {
                    this.size = 1;
                }

                this.width = this.type_Config.width * this.size;

        
                if (Array.isArray(this.type_Config.yPos)) {
                    var yPosConfig = this.type_Config.yPos;
                    this.yPos = yPosConfig[randomNumGen(0, yPosConfig.length - 1)];
                } else {
                    this.yPos = this.type_Config.yPos;
                }

                this.draw();
                if (this.size > 1) {
                    this.collision_boxes[1].width = this.width - this.collision_boxes[0].width -
                        this.collision_boxes[2].width;
                    this.collision_boxes[2].x = this.width - this.collision_boxes[2].width;
                }

     
                if (this.type_Config.speed_Offset) {
                    this.speed_Offset = Math.random() > 0.5 ? this.type_Config.speed_Offset :
                        -this.type_Config.speed_Offset;
                }

                this.gap = this.getGap(this.gapCoefficient, speed);
            },

      
            draw: function () {
                var srcWidth = this.type_Config.width;
                var srcHeight = this.type_Config.height;

                if (IS_HIDPI) {
                    srcWidth = srcWidth * 2;
                    srcHeight = srcHeight * 2;
                }

   
                var srcX = (srcWidth * this.size) * (0.5 * (this.size - 1)) +
                    this.spritePos.x;

           
                if (this.currentFrame > 0) {
                    srcX += srcWidth * this.currentFrame;
                }

                this.canvasContainer.drawImage(Nomad.imgSprite,
                    srcX, this.spritePos.y,
                    srcWidth * this.size, srcHeight,
                    this.xPos, this.yPos,
                    this.type_Config.width * this.size, this.type_Config.height);
            },

         
            update: function (deltaTime, speed) {
                if (!this.remove) {
                    if (this.type_Config.speed_Offset) {
                        speed += this.speed_Offset;
                    }
                    this.xPos -= Math.floor((speed * FPS / 1000) * deltaTime);

                    if (this.type_Config.numFrames) {
                        this.timer += deltaTime;
                        if (this.timer >= this.type_Config.frameRate) {
                            this.currentFrame =
                                this.currentFrame == this.type_Config.numFrames - 1 ?
                                    0 : this.currentFrame + 1;
                            this.timer = 0;
                        }
                    }
                    this.draw();

                    if (!this.isVisible()) {
                        this.remove = true;
                    }
                }
            },

          
            getGap: function (gapCoefficient, speed) {
                var minGap = Math.round(this.width * speed +
                    this.type_Config.minGap * gapCoefficient);
                var maxGap = Math.round(minGap * Block.MAX_GAP_FACTOR);
                return randomNumGen(minGap, maxGap);
            },

            isVisible: function () {
                return this.xPos + this.width > 0;
            },

         
            cloneHitBoxes: function () {
                var collision_boxes = this.type_Config.collision_boxes;

                for (var i = collision_boxes.length - 1; i >= 0; i--) {
                    this.collision_boxes[i] = new HitBox(collision_boxes[i].x,
                        collision_boxes[i].y, collision_boxes[i].width,
                        collision_boxes[i].height);
                }
            }
        };


  
    Block.types = [
        {
            type: 'BLOCK_SMALL',
            width: 17,
            height: 35,
            yPos: 105,
            multipleSpeed: 4,
            minGap: 120,
            minSpeed: 0,
            collision_boxes: [
                new HitBox(0, 7, 5, 27),
                new HitBox(4, 0, 6, 34),
                new HitBox(10, 4, 7, 14)
            ]
        },
        {
            type: 'BLOCK_LARGE',
            width: 25,
            height: 50,
            yPos: 90,
            multipleSpeed: 7,
            minGap: 120,
            minSpeed: 0,
            collision_boxes: [
                new HitBox(0, 12, 7, 38),
                new HitBox(8, 0, 7, 49),
                new HitBox(13, 10, 10, 38)
            ]
        },
        {
            type: 'DUCK',
            width: 46,
            height: 40,
            yPos: [100, 75, 50], 
            multipleSpeed: 999,
            minSpeed: 8.5,
            minGap: 150,
            collision_boxes: [
                new HitBox(15, 15, 16, 5),
                new HitBox(18, 21, 24, 6),
                new HitBox(2, 14, 4, 3),
                new HitBox(6, 10, 4, 7),
                new HitBox(10, 8, 6, 9)
            ],
            numFrames: 2,
            frameRate: 1000 / 6,
            speed_Offset: .8
        }
    ];


    // the boy is the main character of the game
    function Boy(canvas, spritePos) {
        this.canvas = canvas;
        this.canvasContainer = canvas.getContext('2d');
        this.spritePos = spritePos;
        this.xPos = 0;
        this.yPos = 0;
        this.groundYPos = 0;
        this.currentFrame = 0;
        this.currentAnimFrames = [];
        this.blinkDelay = 0;
        this.blinkCount = 0;
        this.animStartTime = 0;
        this.timer = 0;
        this.secPerFrame = 1000 / FPS;
        this.values = Boy.values;
        this.status = Boy.status.WAITING;
        this.isJump = false;
        this.isDuck = false;
        this.jumpSpeed = 0;
        this.hasReachedMinHeight = false;
        this.speedDrop = false;
        this.jumpCtr = 0;
        this.jump_coordinateX = 0;

        this.init();
    };


  
    Boy.values = {
        DROP_SPEED: -5,
        GRAVITY: 0.6,
        HEIGHT: 47,
        HEIGHT_DUCK: 25,
        INIITAL_JUMP_SPEED: -10,
        INTRO_DURATION: 1500,
        MAX_JUMP_HEIGHT: 30,
        MIN_JUMP_HEIGHT: 30,
        SPEED_DROP_COEFFICIENT: 3,
        SPRITE_WIDTH: 262,
        START_X_POS: 50,
        WIDTH: 44,
        WIDTH_DUCK: 59
    };



    Boy.collision_boxes = {
        DUCKING: [
            new HitBox(1, 18, 55, 25)
        ],
        RUNNING: [
            new HitBox(22, 0, 17, 16),
            new HitBox(1, 18, 30, 9),
            new HitBox(10, 35, 14, 8),
            new HitBox(1, 24, 29, 5),
            new HitBox(5, 30, 21, 4),
            new HitBox(9, 34, 15, 4)
        ]
    };


   
    Boy.status = {
        CRASHED: 'CRASHED',
        DUCKING: 'DUCKING',
        JUMPING: 'JUMPING',
        RUNNING: 'RUNNING',
        WAITING: 'WAITING'
    };


    Boy.BLINK_TIMING = 7000;

 
    Boy.animFrames = {
        WAITING: {
            frames: [44, 0],
            secPerFrame: 1000 / 3
        },
        RUNNING: {
            frames: [88, 132],
            secPerFrame: 1000 / 12
        },
        CRASHED: {
            frames: [220],
            secPerFrame: 1000 / 60
        },
        JUMPING: {
            frames: [0],
            secPerFrame: 1000 / 60
        },
        DUCKING: {
            frames: [262, 321],
            secPerFrame: 1000 / 8
        }
    };


    Boy.prototype = {
      
        init: function () {
            this.groundYPos = Nomad.defaultSizes.HEIGHT - this.values.HEIGHT -
                Nomad.values.BOTTOM_PAD;
            this.yPos = this.groundYPos;
            this.minJumpHeight = this.groundYPos - this.values.MIN_JUMP_HEIGHT;

            this.draw(0, 0);
            this.update(0, Boy.status.WAITING);
        },

      
        setJumpSpeed: function (setting) {
            this.values.INIITAL_JUMP_SPEED = -setting;
            this.values.DROP_SPEED = -setting / 2;
        },

  
        update: function (deltaTime, opt_status) {
            this.timer += deltaTime;

     
            if (opt_status) {
                this.status = opt_status;
                this.currentFrame = 0;
                this.secPerFrame = Boy.animFrames[opt_status].secPerFrame;
                this.currentAnimFrames = Boy.animFrames[opt_status].frames;

                if (opt_status == Boy.status.WAITING) {
                    this.animStartTime = getCurrTime();
                    this.setBlink();
                }
            }

   
            if (this.intro && this.xPos < this.values.START_X_POS) {
                this.xPos += Math.round((this.values.START_X_POS /
                    this.values.INTRO_DURATION) * deltaTime);
            }

            if (this.status == Boy.status.WAITING) {
                this.blink(getCurrTime());
            } else {
                this.draw(this.currentAnimFrames[this.currentFrame], 0);
            }


            if (this.timer >= this.secPerFrame) {
                this.currentFrame = this.currentFrame ==
                    this.currentAnimFrames.length - 1 ? 0 : this.currentFrame + 1;
                this.timer = 0;
            }


            if (this.speedDrop && this.yPos == this.groundYPos) {
                this.speedDrop = false;
                this.setDuck(true);
            }
        },

 
        draw: function (x, y) {
            var srcX = x;
            var srcY = y;
            var srcWidth = this.isDuck && this.status != Boy.status.CRASHED ?
                this.values.WIDTH_DUCK : this.values.WIDTH;
            var srcHeight = this.values.HEIGHT;

            if (IS_HIDPI) {
                srcX *= 2;
                srcY *= 2;
                srcWidth *= 2;
                srcHeight *= 2;
            }

            srcX += this.spritePos.x;
            srcY += this.spritePos.y;

  
            if (this.isDuck && this.status != Boy.status.CRASHED) {
                this.canvasContainer.drawImage(Nomad.imgSprite, srcX, srcY,
                    srcWidth, srcHeight,
                    this.xPos, this.yPos,
                    this.values.WIDTH_DUCK, this.values.HEIGHT);
            } else {
             
                if (this.isDuck && this.status == Boy.status.CRASHED) {
                    this.xPos++;
                }
   
                this.canvasContainer.drawImage(Nomad.imgSprite, srcX, srcY,
                    srcWidth, srcHeight,
                    this.xPos, this.yPos,
                    this.values.WIDTH, this.values.HEIGHT);
            }
        },

       
        setBlink: function () {
            this.blinkDelay = Math.ceil(Math.random() * Boy.BLINK_TIMING);
        },

      
        blink: function (time) {
            var deltaTime = time - this.animStartTime;

            if (deltaTime >= this.blinkDelay) {
                this.draw(this.currentAnimFrames[this.currentFrame], 0);

                if (this.currentFrame == 1) {
          
                    this.setBlink();
                    this.animStartTime = time;
                    this.blinkCount++;
                }
            }
        },

      
        startJump: function (speed) {
            if (!this.isJump) {
                this.update(0, Boy.status.JUMPING);
            
                this.jumpSpeed = this.values.INIITAL_JUMP_SPEED - (speed / 10);
                this.isJump = true;
                this.hasReachedMinHeight = false;
                this.speedDrop = false;
            }
        },

        endJump: function () {
            if (this.hasReachedMinHeight &&
                this.jumpSpeed < this.values.DROP_SPEED) {
                this.jumpSpeed = this.values.DROP_SPEED;
            }
        },

      
        updateJump: function (deltaTime, speed) {
            var secPerFrame = Boy.animFrames[this.status].secPerFrame;
            var framesElapsed = deltaTime / secPerFrame;

  
            if (this.speedDrop) {
                this.yPos += Math.round(this.jumpSpeed *
                    this.values.SPEED_DROP_COEFFICIENT * framesElapsed);
            } else {
                this.yPos += Math.round(this.jumpSpeed * framesElapsed);
            }

            this.jumpSpeed += this.values.GRAVITY * framesElapsed;

     
            if (this.yPos < this.minJumpHeight || this.speedDrop) {
                this.hasReachedMinHeight = true;
            }

     
            if (this.yPos < this.values.MAX_JUMP_HEIGHT || this.speedDrop) {
                this.endJump();
            }

            if (this.yPos > this.groundYPos) {
                this.reset();
                this.jumpCtr++;
            }

            this.update(deltaTime);
        },

       
        setDropSpeed: function () {
            this.speedDrop = true;
            this.jumpSpeed = 1;
        },

      
        setDuck: function (isDucking) {
            if (isDucking && this.status != Boy.status.DUCKING) {
                this.update(0, Boy.status.DUCKING);
                this.isDuck = true;
            } else if (this.status == Boy.status.DUCKING) {
                this.update(0, Boy.status.RUNNING);
                this.isDuck = false;
            }
        },

      
        reset: function () {
            this.yPos = this.groundYPos;
            this.jumpSpeed = 0;
            this.isJump = false;
            this.isDuck = false;
            this.update(0, Boy.status.RUNNING);
            this.midair = false;
            this.speedDrop = false;
            this.jumpCtr = 0;
        }
    };



    function distanceCalc(canvas, spritePos, canvasWidth) {
        this.canvas = canvas;
        this.canvasContainer = canvas.getContext('2d');
        this.image = Nomad.imgSprite;
        this.spritePos = spritePos;
        this.x = 0;
        this.y = 5;

        this.curDistance = 0;
        this.maximumScore = 0;
        this.highScore = 0;
        this.container = null;

        this.digits = [];
        this.acheivement = false;
        this.defaultString = '';
        this.flashTimer = 0;
        this.flashIterations = 0;
        this.invertTrigger = false;

        this.values = distanceCalc.values;
        this.maximumScoreUnits = this.values.MAX_DISTANCE_UNITS;
        this.init(canvasWidth);
    };

    distanceCalc.values = {
       
        MAX_DISTANCE_UNITS: 5,
        HI_DIST: 100,
        DIST_FACTOR: 0.025,
        FLASHTIME: 1000 / 4,
        FLASHLOOPS: 3
    };

    distanceCalc.defaultSizes = {
        WIDTH: 10,
        HEIGHT: 13,
        DEST_WIDTH: 11
    };

    distanceCalc.yPos = [0, 13, 27, 40, 53, 67, 80, 93, 107, 120];

    distanceCalc.prototype = {

        init: function (width) {
            var maximumDistanceStr = '';

            this.calculateX(width);
            this.maximumScore = this.maximumScoreUnits;
            for (var i = 0; i < this.maximumScoreUnits; i++) {
                this.draw(i, 0);
                this.defaultString += '0';
                maximumDistanceStr += '9';
            }

            this.maximumScore = parseInt(maximumDistanceStr);
        },

   
        calculateX: function (canvasWidth) {
            this.x = canvasWidth - (distanceCalc.defaultSizes.DEST_WIDTH *
                (this.maximumScoreUnits + 1));
        },


        draw: function (digitPos, value, optional_hiScore) {
            var srcWidth = distanceCalc.defaultSizes.WIDTH;
            var srcHeight = distanceCalc.defaultSizes.HEIGHT;
            var srcX = distanceCalc.defaultSizes.WIDTH * value;
            var srcY = 0;

            var xTarget = digitPos * distanceCalc.defaultSizes.DEST_WIDTH;
            var yTarget = this.y;
            var distanceWidth = distanceCalc.defaultSizes.WIDTH;
            var distanceHeight = distanceCalc.defaultSizes.HEIGHT;

            if (IS_HIDPI) {
                srcWidth *= 2;
                srcHeight *= 2;
                srcX *= 2;
            }

            srcX += this.spritePos.x;
            srcY += this.spritePos.y;

            this.canvasContainer.save();

            if (optional_hiScore) {
                   var highScoreX = this.x - (this.maximumScoreUnits * 2) *
                    distanceCalc.defaultSizes.WIDTH;
                this.canvasContainer.translate(highScoreX, this.y);
            } else {
                this.canvasContainer.translate(this.x, this.y);
            }

            this.canvasContainer.drawImage(this.image, srcX, srcY,
                srcWidth, srcHeight,
                xTarget, yTarget,
                distanceWidth, distanceHeight
            );

            this.canvasContainer.restore();
        },


        getDist: function (distance) {
            return distance ? Math.round(distance * this.values.DIST_FACTOR) : 0;
        },


        update: function (deltaTime, distance) {
            var paint = true;
            var playSound = false;

            if (!this.acheivement) {
                distance = this.getDist(distance);
                
                if (distance > this.maximumScore && this.maximumScoreUnits ==
                    this.values.MAX_DISTANCE_UNITS) {
                    this.maximumScoreUnits++;
                    this.maximumScore = parseInt(this.maximumScore + '9');
                } else {
                    this.distance = 0;
                }

                if (distance > 0) {
                    
                    if (distance % this.values.HI_DIST == 0) {
                        
                        this.acheivement = true;
                        this.flashTimer = 0;
                        playSound = true;
                    }

                    
                    var distanceStr = (this.defaultString +
                        distance).substr(-this.maximumScoreUnits);
                    this.digits = distanceStr.split('');
                } else {
                    this.digits = this.defaultString.split('');
                }
            } else {
                
                if (this.flashIterations <= this.values.FLASHLOOPS) {
                    this.flashTimer += deltaTime;

                    if (this.flashTimer < this.values.FLASHTIME) {
                        paint = false;
                    } else if (this.flashTimer >
                        this.values.FLASHTIME * 2) {
                        this.flashTimer = 0;
                        this.flashIterations++;
                    }
                } else {
                    this.acheivement = false;
                    this.flashIterations = 0;
                    this.flashTimer = 0;
                }
            }

            if (paint) {
                for (var i = this.digits.length - 1; i >= 0; i--) {
                    this.draw(i, parseInt(this.digits[i]));
                }
            }

            this.displayHighScore();
            return playSound;
        },

  
        displayHighScore: function () {
            this.canvasContainer.save();
            this.canvasContainer.globalAlpha = .8;
            for (var i = this.highScore.length - 1; i >= 0; i--) {
                this.draw(i, parseInt(this.highScore[i], 10), true);
            }
            this.canvasContainer.restore();
        },


        setHighScore: function (distance) {
            distance = this.getDist(distance);
            var highScoreStr = (this.defaultString +
                distance).substr(-this.maximumScoreUnits);

            this.highScore = ['10', '11', ''].concat(highScoreStr.split(''));
        },

 
        reset: function () {
            this.update(0);
            this.acheivement = false;
        }
    };



    function Clouds(canvas, spritePos, containerWidth) {
        this.canvas = canvas;
        this.canvasContainer = this.canvas.getContext('2d');
        this.spritePos = spritePos;
        this.containerWidth = containerWidth;
        this.xPos = containerWidth;
        this.yPos = 0;
        this.remove = false;
        this.cloudGap = randomNumGen(Clouds.values.MIN_CLOUD_GAP,
            Clouds.values.MAX_CLOUD_GAP);

        this.init();
    };

    Clouds.values = {
        HEIGHT: 14,
        MAX_CLOUD_GAP: 400,
        MAX_SKY_LEVEL: 30,
        MIN_CLOUD_GAP: 100,
        MIN_SKY_LEVEL: 71,
        WIDTH: 46
    };

    Clouds.prototype = {
     
        init: function () {
            this.yPos = randomNumGen(Clouds.values.MAX_SKY_LEVEL,
                Clouds.values.MIN_SKY_LEVEL);
            this.draw();
        },

        draw: function () {
            this.canvasContainer.save();
            var srcWidth = Clouds.values.WIDTH;
            var srcHeight = Clouds.values.HEIGHT;

            if (IS_HIDPI) {
                srcWidth = srcWidth * 2;
                srcHeight = srcHeight * 2;
            }

            this.canvasContainer.drawImage(Nomad.imgSprite, this.spritePos.x,
                this.spritePos.y,
                srcWidth, srcHeight,
                this.xPos, this.yPos,
                Clouds.values.WIDTH, Clouds.values.HEIGHT);

            this.canvasContainer.restore();
        },

        update: function (speed) {
            if (!this.remove) {
                this.xPos -= Math.ceil(speed);
                this.draw();
            if (!this.isVisible()) {
                    this.remove = true;
                }
            }
        },


        isVisible: function () {
            return this.xPos + Clouds.values.WIDTH > 0;
        }
    };


    function Land(canvas, spritePos) {
        this.spritePos = spritePos;
        this.canvas = canvas;
        this.canvasContainer = canvas.getContext('2d');
        this.sourceDimensions = {};
        this.defaultSizes = Land.defaultSizes;
        this.sourceXPos = [this.spritePos.x, this.spritePos.x +
            this.defaultSizes.WIDTH];
        this.xPos = [];
        this.yPos = 0;
        this.bumpThreshold = 0.5;

        this.setLandDimensions();
        this.draw();
    };


    Land.defaultSizes = {
        WIDTH: 600,
        HEIGHT: 12,
        YPOS: 127
    };


    Land.prototype = {

        setLandDimensions: function () {

            for (var dimension in Land.defaultSizes) {
                if (IS_HIDPI) {
                    if (dimension != 'YPOS') {
                        this.sourceDimensions[dimension] =
                            Land.defaultSizes[dimension] * 2;
                    }
                } else {
                    this.sourceDimensions[dimension] =
                        Land.defaultSizes[dimension];
                }
                this.defaultSizes[dimension] = Land.defaultSizes[dimension];
            }

            this.xPos = [0, Land.defaultSizes.WIDTH];
            this.yPos = Land.defaultSizes.YPOS;
        },


        getRandomType: function () {
            return Math.random() > this.bumpThreshold ? this.defaultSizes.WIDTH : 0;
        },

        draw: function () {
            this.canvasContainer.drawImage(Nomad.imgSprite, this.sourceXPos[0],
                this.spritePos.y,
                this.sourceDimensions.WIDTH, this.sourceDimensions.HEIGHT,
                this.xPos[0], this.yPos,
                this.defaultSizes.WIDTH, this.defaultSizes.HEIGHT);

            this.canvasContainer.drawImage(Nomad.imgSprite, this.sourceXPos[1],
                this.spritePos.y,
                this.sourceDimensions.WIDTH, this.sourceDimensions.HEIGHT,
                this.xPos[1], this.yPos,
                this.defaultSizes.WIDTH, this.defaultSizes.HEIGHT);
        },

        updateX: function (pos, increment) {
            var line1 = pos;
            var line2 = pos == 0 ? 1 : 0;

            this.xPos[line1] -= increment;
            this.xPos[line2] = this.xPos[line1] + this.defaultSizes.WIDTH;

            if (this.xPos[line1] <= -this.defaultSizes.WIDTH) {
                this.xPos[line1] += this.defaultSizes.WIDTH * 2;
                this.xPos[line2] = this.xPos[line1] - this.defaultSizes.WIDTH;
                this.sourceXPos[line1] = this.getRandomType() + this.spritePos.x;
            }
        },

        update: function (deltaTime, speed) {
            var increment = Math.floor(speed * (FPS / 1000) * deltaTime);

            if (this.xPos[0] <= 0) {
                this.updateX(0, increment);
            } else {
                this.updateX(1, increment);
            }
            this.draw();
        },

        reset: function () {
            this.xPos[0] = 0;
            this.xPos[1] = Land.defaultSizes.WIDTH;
        }
    };


    function Space(canvas, spritePos, defaultSizes, gapCoefficient) {
        this.canvas = canvas;
        this.canvasContainer = this.canvas.getContext('2d');
        this.values = Space.values;
        this.defaultSizes = defaultSizes;
        this.gapCoefficient = gapCoefficient;
        this.Blocks = [];
        this.BlockHistory = [];
        this.horizonOffsets = [0, 0];
        this.cloudFreq = this.values.CLOUD_FREQ;
        this.spritePos = spritePos;
        this.clouds = [];
        this.cloudSpeed = this.values.BG_CLOUD_SPEED;
        this.horizonLine = null;
        this.init();
    };


    Space.values = {
        BG_CLOUD_SPEED: 0.2,
        BUMPY_THRESHOLD: .3,
        CLOUD_FREQ: .5,
        HORIZON_HEIGHT: 16,
        MAX_CLOUDS: 6
    };


    Space.prototype = {
        init: function () {
            this.addCloud();
            this.horizonLine = new Land(this.canvas, this.spritePos.HORIZON);
   
        },

        update: function (deltaTime, curSpeed, updateBox, showNightMode) {
            this.runningTime += deltaTime;
            this.horizonLine.update(deltaTime, curSpeed);
            this.updateClouds(deltaTime, curSpeed);

            if (updateBox) {
                this.updateBox(deltaTime, curSpeed);
            }
        },

        updateClouds: function (deltaTime, speed) {
            var cloudSpeed = this.cloudSpeed / 1000 * deltaTime * speed;
            var cloudNum = this.clouds.length;

            if (cloudNum) {
                for (var i = cloudNum - 1; i >= 0; i--) {
                    this.clouds[i].update(cloudSpeed);
                }

                var lastCloud = this.clouds[cloudNum - 1];

                if (cloudNum < this.values.MAX_CLOUDS &&
                    (this.defaultSizes.WIDTH - lastCloud.xPos) > lastCloud.cloudGap &&
                    this.cloudFreq > Math.random()) {
                    this.addCloud();
                }

                this.clouds = this.clouds.filter(function (obj) {
                    return !obj.remove;
                });
            } else {
                this.addCloud();
            }
        },

        updateBox: function (deltaTime, curSpeed) {
            var updatedBlocks = this.Blocks.slice(0);

            for (var i = 0; i < this.Blocks.length; i++) {
                var Block = this.Blocks[i];
                Block.update(deltaTime, curSpeed);

                if (Block.remove) {
                    updatedBlocks.shift();
                }
            }
            this.Blocks = updatedBlocks;

            if (this.Blocks.length > 0) {
                var lastBlock = this.Blocks[this.Blocks.length - 1];

                if (lastBlock && !lastBlock.followingBlockCreated &&
                    lastBlock.isVisible() &&
                    (lastBlock.xPos + lastBlock.width + lastBlock.gap) <
                    this.defaultSizes.WIDTH) {
                    this.addBox(curSpeed);
                    lastBlock.followingBlockCreated = true;
                }
            } else {
                this.addBox(curSpeed);
            }
        },

        removeFirstBox: function () {
            this.Blocks.shift();
        },

        addBox: function (curSpeed) {
            var BlockTypeIndex = randomNumGen(0, Block.types.length - 1);
            var BlockType = Block.types[BlockTypeIndex];

            if (this.checkBox(BlockType.type) ||
                curSpeed < BlockType.minSpeed) {
                this.addBox(curSpeed);
            } else {
                var BlockSpritePos = this.spritePos[BlockType.type];

                this.Blocks.push(new Block(this.canvasContainer, BlockType,
                    BlockSpritePos, this.defaultSizes,
                    this.gapCoefficient, curSpeed, BlockType.width));

                this.BlockHistory.unshift(BlockType.type);

                if (this.BlockHistory.length > 1) {
                    this.BlockHistory.splice(Nomad.values.MAX_BLOCK_DUPLICATION);
                }
            }
        },

        checkBox: function (nextBlockType) {
            var duplicateCount = 0;

            for (var i = 0; i < this.BlockHistory.length; i++) {
                duplicateCount = this.BlockHistory[i] == nextBlockType ?
                    duplicateCount + 1 : 0;
            }
            return duplicateCount >= Nomad.values.MAX_BLOCK_DUPLICATION;
        },

        reset: function () {
            this.Blocks = [];
            this.horizonLine.reset();
        },

        resize: function (width, height) {
            this.canvas.width = width;
            this.canvas.height = height;
        },

        addCloud: function () {
            this.clouds.push(new Clouds(this.canvas, this.spritePos.CLOUD,
                this.defaultSizes.WIDTH));
        }
    };
})();


function onDocumentLoad() {
    new Nomad('.interstitial-wrapper');
}

document.addEventListener('DOMContentLoaded', onDocumentLoad);
