
(function () {
    'use strict';
    
    // class for the whole gameplay
    function Nomad(outerContainerId, optional_custom) {
        
        if (Nomad.instance_) {
            return Nomad.instance_;
        }
        
        //init the singlton instance
        Nomad.instance_ = this;

        //Layout Details
        this.outerCont = document.querySelector(outerContainerId);
        this.container1 = null;
        this.snackbar1 = null;
        this.detailsButton = this.outerCont.querySelector('#details-button');

        this.values = optional_custom || Nomad.values;

        this.defaultSizes = Nomad.defaultSizes;

        this.canvas = null;
        this.canvasContainer = null;

        this.boy = null;

        this.distanceMeasure = null;
        this.distanceRan = 0;

        this.hiScore = 0;

        this.time = 0;
        this.runningTime = 0;
        this.msPerFrame = 1000 / FPS;
        this.currentSpeed = this.values.SPEED;

        this.Blocks = [];

        // GAME STATES
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

    Nomad.values = {
        ACCELERATION: 0.001,
        BG_CLOUD_SPEED: 0.2,
        BOTTOM_PAD: 10,
        CLEAR_TIME: 3000,
        CLOUD_FREQUENCY: 0.5,
        GAMEOVER_CLEAR_TIME: 750,
        SPACEFACTOR: 0.6,
        GRAVITY: 0.6,
        FIRST_JUMP_VELOCITY: 12,
        INVERT_FADE_DURATION: 12000,
        INVERT_DISTANCE: 700,
        MAX_BLINK_COUNT: 3,
        MAX_CLOUDS: 6,
        MAX_BLOCK_LENGTH: 3,
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

    //CSS STUFF
    Nomad.classes = {
        CANVAS: 'Nomad-canvas',
        CONTAINER: 'Nomad-container',
        CRASHED: 'crashed',
        ICON: 'icon-offline',
        INVERTED: 'inverted',
        SNACKBAR: 'snackbar',
        SNACKBAR_SHOW: 'snackbar-show'
    };


    Nomad.spriteCoordinates = {
        LDPI: {
            OBSTACLE_LARGE: { x: 332, y: 2 },
            OBSTACLE_SMALL: { x: 228, y: 2 },
            CLOUD: { x: 86, y: 2 },
            HORIZON: { x: 2, y: 54 },
            BIRD: { x: 134, y: 2 },
            RESTART: { x: 2, y: 2 },
            TEXT_SPRITE: { x: 655, y: 2 },
            BOY: { x: 848, y: 2 }
        },
        HDPI: {
            OBSTACLE_LARGE: { x: 652, y: 2 },
            OBSTACLE_SMALL: { x: 446, y: 2 },
            CLOUD: { x: 166, y: 2 },
            HORIZON: { x: 2, y: 104 },
            BIRD: { x: 260, y: 2 },
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
        TOUCHEND: 'touchend',
        TOUCHSTART: 'touchstart',
        VISIBILITY: 'visibilitychange',
        BLUR: 'blur',
        FOCUS: 'focus',
        LOAD: 'load'
    };


    Nomad.prototype = {

        isDisabled: function () {
            // return loadTimeData && loadTimeData.valueExists('disabledEasterEgg');
            return false;
        },

        //ADJUST THE ZOOM IN AND THE ZOOM OUT
        loadImg: function () {
            if (IS_HIDPI) {
                Nomad.imageSprite = document.getElementById('offline-resources-2x');
                this.spriteDef = Nomad.spriteCoordinates.HDPI;
            } else {
                Nomad.imageSprite = document.getElementById('offline-resources-1x');
                this.spriteDef = Nomad.spriteCoordinates.LDPI;
            }

            if (Nomad.imageSprite.complete) {
                this.init();
            } else {
                // If the images are not yet loaded, add a listener.
                Nomad.imageSprite.addEventListener(Nomad.events.LOAD,
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
            var speed = optionalSpeed || this.currentSpeed;

            if (optionalSpeed) {
                this.currentSpeed = optionalSpeed;
            }
        },

        init: function () {

            document.querySelector('.' + Nomad.classes.ICON).style.visibility =
                'hidden';

            this.setSpeed();

            this.container1 = document.createElement('div');
            this.container1.className = Nomad.classes.CONTAINER;

            this.canvas = createCanvas(this.container1, this.defaultSizes.WIDTH,
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

                if (this.boy.jumping) {
                    this.boy.updateJump(deltaTime);
                }

                this.runningTime += deltaTime;
                var hasBlocks = this.runningTime > this.values.CLEAR_TIME;

                // First jump triggers the intro.
                if (this.boy.jumpCount == 1 && !this.intro) {
                    this.gameIntro();
                }

                // The horizon doesn't move until the intro is over.
                if (this.intro) {
                    this.horizon.update(0, this.currentSpeed, hasBlocks);
                } else {
                    deltaTime = !this.activated ? 0 : deltaTime;
                    this.horizon.update(deltaTime, this.currentSpeed, hasBlocks,
                        this.inverted);
                }

                // Check for collisions.
                var collision = hasBlocks &&
                    checkForHit(this.horizon.Blocks[0], this.boy);

                if (!collision) {
                    this.distanceRan += this.currentSpeed * deltaTime / this.msPerFrame;

                    if (this.currentSpeed < this.values.MAX_SPEED) {
                        this.currentSpeed += this.values.ACCELERATION;
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

            if (this.playing || (!this.activated &&
                this.boy.blinkCount < Nomad.values.MAX_BLINK_COUNT)) {
                this.boy.update(deltaTime);
                this.schedUpdate();
            }
        },

        /**
         * Event handler.
         */
        handleEvent: function (e) {
            return (function (evtType, events) {
                switch (evtType) {
                    case events.KEYDOWN:
                    case events.TOUCHSTART:
                    case events.MOUSEDOWN:
                        this.onDownPress(e);
                        break;
                    case events.KEYUP:
                    case events.TOUCHEND:
                    case events.MOUSEUP:
                        this.onUpPress(e);
                        break;
                }
            }.bind(this))(e.type, Nomad.events);
        },

        /**
         * Bind relevant key / mouse
         */
        startListeners: function () {
            // Keys.
            document.addEventListener(Nomad.events.KEYDOWN, this);
            document.addEventListener(Nomad.events.KEYUP, this);
            document.addEventListener(Nomad.events.MOUSEDOWN, this);
            document.addEventListener(Nomad.events.MOUSEUP, this);
        },

        /**
         * Remove all listeners.
         */
        stopListeners: function () {
            document.removeEventListener(Nomad.events.KEYDOWN, this);
            document.removeEventListener(Nomad.events.KEYUP, this);
            document.removeEventListener(Nomad.events.MOUSEDOWN, this);
            document.removeEventListener(Nomad.events.MOUSEUP, this);
        },

        /**
         * Process keydown.
         * @param {Event} e
         */
        onDownPress: function (e) {
            if (e.target != this.detailsButton) {
                if (!this.crashed && (Nomad.keyActions.JUMP[e.keyCode] ||
                    e.type == Nomad.events.TOUCHSTART)) {
                    if (!this.playing) {
                        this.loadAudio();
                        this.playing = true;
                        this.update();
                        if (window.errorPageController) {
                            errorPageController.trackEasterEgg();
                        }
                    }
                    //  Play sound effect and jump on starting the game for the first time.
                    if (!this.boy.jumping && !this.boy.ducking) {
                        this.playSound(this.soundFx.BUTTON_PRESS);
                        this.boy.startJump(this.currentSpeed);
                    }
                }

                if (this.crashed && e.type == Nomad.events.TOUCHSTART &&
                    e.currentTarget == this.container1) {
                    this.restart();
                }
            }

            if (this.playing && !this.crashed && Nomad.keyActions.DUCK[e.keyCode]) {
                e.preventDefault();
                if (this.boy.jumping) {
                    // Speed drop, activated only when jump key is not pressed.
                    this.boy.setDropSpeed();
                } else if (!this.boy.jumping && !this.boy.ducking) {
                    // Duck.
                    this.boy.setDuck(true);
                }
            }
        },


        /**
         * Process key up.
         * @param {Event} e
         */
        onUpPress: function (e) {
            var keyCode = String(e.keyCode);
            var isjumpKey = Nomad.keyActions.JUMP[keyCode] ||
                e.type == Nomad.events.TOUCHEND ||
                e.type == Nomad.events.MOUSEDOWN;

            if (this.isRunning() && isjumpKey) {
                this.boy.endJump();
            } else if (Nomad.keyActions.DUCK[keyCode]) {
                this.boy.speedDrop = false;
                this.boy.setDuck(false);
            } else if (this.crashed) {
                // Check that enough time has elapsed before allowing jump key to restart.
                var deltaTime = getCurrTime() - this.time;

                if (Nomad.keyActions.RESTART[keyCode] || this.isLeftClickOnCanvas(e) ||
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

        /**
         * Returns whether the event was a left click on canvas.
         * On Windows right click is registered as a click.
         * @param {Event} e
         * @return {boolean}
         */
        isLeftClickOnCanvas: function (e) {
            return e.button != null && e.button < 2 &&
                e.type == Nomad.events.MOUSEUP && e.target == this.canvas;
        },

        /**
         * RequestAnimationFrame wrapper.
         */
        schedUpdate: function () {
            if (!this.updatePending) {
                this.updatePending = true;
                this.raqId = requestAnimationFrame(this.update.bind(this));
            }
        },

        /**
         * Whether the game is running.
         * @return {boolean}
         */
        isRunning: function () {
            return !!this.raqId;
        },

        /**
         * Game over state.
         */
        gameOver: function () {
            this.playSound(this.soundFx.HIT);
            //vibrate(200);

            this.stop();
            this.crashed = true;
            this.distanceMeasure.acheivement = false;

            this.boy.update(100, Boy.status.CRASHED);

            // Game over panel.
            if (!this.GameOverScreen) {
                this.GameOverScreen = new GameOverScreen(this.canvas,
                    this.spriteDef.TEXT_SPRITE, this.spriteDef.RESTART,
                    this.defaultSizes);
            } else {
                this.GameOverScreen.draw();
            }

            // Update the high score.
            if (this.distanceRan > this.hiScore) {
                this.hiScore = Math.ceil(this.distanceRan);
                this.distanceMeasure.setHighScore(this.hiScore);
            }

            // Reset the time clock.
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

        /**
         * Pause the game if the tab is not in focus.
         */
        onVisibilityChange: function (e) {
            if (document.hidden || document.webkitHidden || e.type == 'blur' ||
                document.visibilityState != 'visible') {
                this.stop();
            } else if (!this.crashed) {
                this.boy.reset();
                this.play();
            }
        },

        /**
         * Play a sound.
         * @param {SoundBuffer} soundBuffer
         */
        playSound: function (soundBuffer) {
            if (soundBuffer) {
                var sourceNode = this.audio_context.createBufferSource();
                sourceNode.buffer = soundBuffer;
                sourceNode.connect(this.audio_context.destination);
                sourceNode.start(0);
            }
        },

        /**
         * Inverts the current page / canvas colors.
         * @param {boolean} Whether to reset colors.
         */
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


    /**
     * Updates the canvas size taking into
     * account the backing store pixel ratio and
     * the device pixel ratio.
     *
     * @param {HTMLCanvasElement} canvas
     * @param {number} opt_width
     * @param {number} opt_height
     * @return {boolean} Whether the canvas was scaled.
     */
    Nomad.updateScreenScaling = function (canvas, opt_width, opt_height) {
        var context = canvas.getContext('2d');

        // Query the various pixel ratios
        var devicePixelRatio = Math.floor(window.devicePixelRatio) || 1;
        var backingStoreRatio = Math.floor(context.webkitBackingStorePixelRatio) || 1;
        var ratio = devicePixelRatio / backingStoreRatio;

        // Upscale the canvas if the two ratios don't match
        if (devicePixelRatio !== backingStoreRatio) {
            var oldWidth = opt_width || canvas.width;
            var oldHeight = opt_height || canvas.height;

            canvas.width = oldWidth * ratio;
            canvas.height = oldHeight * ratio;

            canvas.style.width = oldWidth + 'px';
            canvas.style.height = oldHeight + 'px';

            // Scale the context to counter the fact that we've manually scaled
            // our canvas element.
            context.scale(ratio, ratio);
            return true;
        } else if (devicePixelRatio == 1) {
            // Reset the canvas width / height. Fixes scaling bug when the page is
            // zoomed and the devicePixelRatio changes accordingly.
            canvas.style.width = canvas.width + 'px';
            canvas.style.height = canvas.height + 'px';
        }
        return false;
    };


    /**
     * Get random number.
     * @param {number} min
     * @param {number} max
     * @param {number}
     */
    function randomNumGen(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    /**
     * Create canvas element.
     * @param {HTMLElement} container Element to append canvas to.
     * @param {number} width
     * @param {number} height
     * @param {string} opt_classname
     * @return {HTMLCanvasElement}
     */
    function createCanvas(container, width, height, opt_classname) {
        var canvas = document.createElement('canvas');
        canvas.className = opt_classname ? Nomad.classes.CANVAS + ' ' +
            opt_classname : Nomad.classes.CANVAS;
        canvas.width = width;
        canvas.height = height;
        container.appendChild(canvas);

        return canvas;
    }


    /**
     * Decodes the base 64 audio to ArrayBuffer used by Web Audio.
     * @param {string} base64String
     */
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


    /**
     * Return the current timestamp.
     * @return {number}
     */
    function getCurrTime() {
        return performance.now();
    }


    //******************************************************************************


    /**
     * Game over panel.
     * @param {!HTMLCanvasElement} canvas
     * @param {Object} textImgPos
     * @param {Object} restartImgPos
     * @param {!Object} defaultSizes Canvas defaultSizes.
     * @constructor
     */
    function GameOverScreen(canvas, textImgPos, restartImgPos, defaultSizes) {
        this.canvas = canvas;
        this.canvasContainer = canvas.getContext('2d');
        this.canvasDimensions = defaultSizes;
        this.textImgPos = textImgPos;
        this.restartImgPos = restartImgPos;
        this.draw();
    };


    /**
     * Dimensions used in the panel.
     * @enum {number}
     */
    GameOverScreen.defaultSizes = {
        TEXT_X: 0,
        TEXT_Y: 13,
        TEXT_WIDTH: 191,
        TEXT_HEIGHT: 11,
        RESTART_WIDTH: 36,
        RESTART_HEIGHT: 32
    };


    GameOverScreen.prototype = {
        /**
         * Update the panel defaultSizes.
         * @param {number} width New canvas width.
         * @param {number} opt_height Optional new canvas height.
         */
        updateDimensions: function (width, opt_height) {
            this.canvasDimensions.WIDTH = width;
            if (opt_height) {
                this.canvasDimensions.HEIGHT = opt_height;
            }
        },

        /**
         * Draw the panel.
         */
        draw: function () {
            var defaultSizes = GameOverScreen.defaultSizes;

            var centerX = this.canvasDimensions.WIDTH / 2;

            // Game over text.
            var textSourceX = defaultSizes.TEXT_X;
            var textSourceY = defaultSizes.TEXT_Y;
            var textSourceWidth = defaultSizes.TEXT_WIDTH;
            var textSourceHeight = defaultSizes.TEXT_HEIGHT;

            var textTargetX = Math.round(centerX - (defaultSizes.TEXT_WIDTH / 2));
            var textTargetY = Math.round((this.canvasDimensions.HEIGHT - 25) / 3);
            var textTargetWidth = defaultSizes.TEXT_WIDTH;
            var textTargetHeight = defaultSizes.TEXT_HEIGHT;

            var restartSourceWidth = defaultSizes.RESTART_WIDTH;
            var restartSourceHeight = defaultSizes.RESTART_HEIGHT;
            var restartTargetX = centerX - (defaultSizes.RESTART_WIDTH / 2);
            var restartTargetY = this.canvasDimensions.HEIGHT / 2;

            if (IS_HIDPI) {
                textSourceY *= 2;
                textSourceX *= 2;
                textSourceWidth *= 2;
                textSourceHeight *= 2;
                restartSourceWidth *= 2;
                restartSourceHeight *= 2;
            }

            textSourceX += this.textImgPos.x;
            textSourceY += this.textImgPos.y;

            // Game over text from sprite.
            this.canvasContainer.drawImage(Nomad.imageSprite,
                textSourceX, textSourceY, textSourceWidth, textSourceHeight,
                textTargetX, textTargetY, textTargetWidth, textTargetHeight);

            // Restart button.
            this.canvasContainer.drawImage(Nomad.imageSprite,
                this.restartImgPos.x, this.restartImgPos.y,
                restartSourceWidth, restartSourceHeight,
                restartTargetX, restartTargetY, defaultSizes.RESTART_WIDTH,
                defaultSizes.RESTART_HEIGHT);
        }
    };


    //******************************************************************************

    /**
     * Check for a collision.
     * @param {!Block} Block
     * @param {!Boy} boy T-rex object.
     * @param {HTMLCanvasContext} opt_canvasCtx Optional canvas context for drawing
     *    collision boxes.
     * @return {Array<CollisionBox>}
     */
    function checkForHit(Block, boy, opt_canvasCtx) {
        var BlockBoxXPos = Nomad.defaultSizes.WIDTH + Block.xPos;

        // Adjustments are made to the bounding box as there is a 1 pixel white
        // border around the t-rex and Blocks.
        var rBoyBox = new HitBox(
            boy.xPos + 1,
            boy.yPos + 1,
            boy.values.WIDTH - 2,
            boy.values.HEIGHT - 2);

        var BlockBox = new HitBox(
            Block.xPos + 1,
            Block.yPos + 1,
            Block.typeConfig.width * Block.size - 2,
            Block.typeConfig.height - 2);

        // Debug outer box
        if (opt_canvasCtx) {
            drawHitBox(opt_canvasCtx, rBoyBox, BlockBox);
        }

        // Simple outer bounds check.
        if (boxCompare(rBoyBox, BlockBox)) {
            var collisionBoxes = Block.collisionBoxes;
            var rBoyCollisionBoxes = boy.ducking ?
                Boy.collisionBoxes.DUCKING : Boy.collisionBoxes.RUNNING;

            // Detailed axis aligned box check.
            for (var t = 0; t < rBoyCollisionBoxes.length; t++) {
                for (var i = 0; i < collisionBoxes.length; i++) {
                    // Adjust the box to actual positions.
                    var adj_BoyBox =
                        adjustHitBox(rBoyCollisionBoxes[t], rBoyBox);
                    var adjBlockBox =
                        adjustHitBox(collisionBoxes[i], BlockBox);
                    var crashed = boxCompare(adj_BoyBox, adjBlockBox);

                    // Draw boxes for debug.
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


    /**
     * Adjust the collision box.
     * @param {!CollisionBox} box The original box.
     * @param {!CollisionBox} adjustment Adjustment box.
     * @return {CollisionBox} The adjusted collision box object.
     */
    function adjustHitBox(box, adjustment) {
        return new HitBox(
            box.x + adjustment.x,
            box.y + adjustment.y,
            box.width,
            box.height);
    };


    /**
     * Draw the collision boxes for debug.
     */
    function drawHitBox(canvasContainer, rBoyBox, BlockBox) {
        canvasContainer.save();
        canvasContainer.strokeStyle = '#f00';
        canvasContainer.strokeRect(rBoyBox.x, rBoyBox.y, rBoyBox.width, rBoyBox.height);

        canvasContainer.strokeStyle = '#0f0';
        canvasContainer.strokeRect(BlockBox.x, BlockBox.y,
            BlockBox.width, BlockBox.height);
        canvasContainer.restore();
    };


    /**
     * Compare two collision boxes for a collision.
     * @param {CollisionBox} rBoyBox
     * @param {CollisionBox} BlockBox
     * @return {boolean} Whether the boxes intersected.
     */
    function boxCompare(rBoyBox, BlockBox) {
        var crashed = false;
        var rBoyBoxX = rBoyBox.x;
        var rBoyBoxY = rBoyBox.y;

        var BlockBoxX = BlockBox.x;
        var BlockBoxY = BlockBox.y;

        // Axis-Aligned Bounding Box method.
        if (rBoyBox.x < BlockBoxX + BlockBox.width &&
            rBoyBox.x + rBoyBox.width > BlockBoxX &&
            rBoyBox.y < BlockBox.y + BlockBox.height &&
            rBoyBox.height + rBoyBox.y > BlockBox.y) {
            crashed = true;
        }

        return crashed;
    };


    //******************************************************************************

    /**
     * Collision box object.
     * @param {number} x X position.
     * @param {number} y Y Position.
     * @param {number} w Width.
     * @param {number} h Height.
     */
    function HitBox(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.width = w;
        this.height = h;
    };


    //******************************************************************************

    /**
     * Block.
     * @param {HTMLCanvasCtx} canvasContainer
     * @param {Block.type} type
     * @param {Object} spritePos Block position in sprite.
     * @param {Object} defaultSizes
     * @param {number} gapCoefficient Mutipler in determining the gap.
     * @param {number} speed
     * @param {number} opt_xOffset
     */
    function Block(canvasContainer, type, spriteImgPos, defaultSizes,
        gapCoefficient, speed, opt_xOffset) {

        this.canvasContainer = canvasContainer;
        this.spritePos = spriteImgPos;
        this.typeConfig = type;
        this.gapCoefficient = gapCoefficient;
        this.size = randomNumGen(1, Block.MAX_BLOCK_LENGTH);
        this.defaultSizes = defaultSizes;
        this.remove = false;
        this.xPos = defaultSizes.WIDTH + (opt_xOffset || 0);
        this.yPos = 0;
        this.width = 0;
        this.collisionBoxes = [];
        this.gap = 0;
        this.speedOffset = 0;

        // For animated Blocks.
        this.currentFrame = 0;
        this.timer = 0;

        this.init(speed);
    };

    /**
     * Coefficient for calculating the maximum gap.
     * @const
     */
    Block.MAX_GAP_COEFFICIENT = 1.5;

    /**
     * Maximum Block grouping count.
     * @const
     */
    Block.MAX_BLOCK_LENGTH = 3,


        Block.prototype = {
            /**
             * Initialise the DOM for the Block.
             * @param {number} speed
             */
            init: function (speed) {
                this.cloneHitBoxes();

                // Only allow sizing if we're at the right speed.
                if (this.size > 1 && this.typeConfig.multipleSpeed > speed) {
                    this.size = 1;
                }

                this.width = this.typeConfig.width * this.size;

                // Check if Block can be positioned at various heights.
                if (Array.isArray(this.typeConfig.yPos)) {
                    var yPosConfig = this.typeConfig.yPos;
                    this.yPos = yPosConfig[randomNumGen(0, yPosConfig.length - 1)];
                } else {
                    this.yPos = this.typeConfig.yPos;
                }

                this.draw();

                // Make collision box adjustments,
                // Central box is adjusted to the size as one box.
                //      ____        ______        ________
                //    _|   |-|    _|     |-|    _|       |-|
                //   | |<->| |   | |<--->| |   | |<----->| |
                //   | | 1 | |   | |  2  | |   | |   3   | |
                //   |_|___|_|   |_|_____|_|   |_|_______|_|
                //
                if (this.size > 1) {
                    this.collisionBoxes[1].width = this.width - this.collisionBoxes[0].width -
                        this.collisionBoxes[2].width;
                    this.collisionBoxes[2].x = this.width - this.collisionBoxes[2].width;
                }

                // For Blocks that go at a different speed from the horizon.
                if (this.typeConfig.speedOffset) {
                    this.speedOffset = Math.random() > 0.5 ? this.typeConfig.speedOffset :
                        -this.typeConfig.speedOffset;
                }

                this.gap = this.getGap(this.gapCoefficient, speed);
            },

            /**
             * Draw and crop based on size.
             */
            draw: function () {
                var sourceWidth = this.typeConfig.width;
                var sourceHeight = this.typeConfig.height;

                if (IS_HIDPI) {
                    sourceWidth = sourceWidth * 2;
                    sourceHeight = sourceHeight * 2;
                }

                // X position in sprite.
                var sourceX = (sourceWidth * this.size) * (0.5 * (this.size - 1)) +
                    this.spritePos.x;

                // Animation frames.
                if (this.currentFrame > 0) {
                    sourceX += sourceWidth * this.currentFrame;
                }

                this.canvasContainer.drawImage(Nomad.imageSprite,
                    sourceX, this.spritePos.y,
                    sourceWidth * this.size, sourceHeight,
                    this.xPos, this.yPos,
                    this.typeConfig.width * this.size, this.typeConfig.height);
            },

            /**
             * Block frame update.
             * @param {number} deltaTime
             * @param {number} speed
             */
            update: function (deltaTime, speed) {
                if (!this.remove) {
                    if (this.typeConfig.speedOffset) {
                        speed += this.speedOffset;
                    }
                    this.xPos -= Math.floor((speed * FPS / 1000) * deltaTime);

                    // Update frame
                    if (this.typeConfig.numFrames) {
                        this.timer += deltaTime;
                        if (this.timer >= this.typeConfig.frameRate) {
                            this.currentFrame =
                                this.currentFrame == this.typeConfig.numFrames - 1 ?
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

            /**
             * Calculate a random gap size.
             * - Minimum gap gets wider as speed increses
             * @param {number} gapCoefficient
             * @param {number} speed
             * @return {number} The gap size.
             */
            getGap: function (gapCoefficient, speed) {
                var minGap = Math.round(this.width * speed +
                    this.typeConfig.minGap * gapCoefficient);
                var maxGap = Math.round(minGap * Block.MAX_GAP_COEFFICIENT);
                return randomNumGen(minGap, maxGap);
            },

            /**
             * Check if Block is visible.
             * @return {boolean} Whether the Block is in the game area.
             */
            isVisible: function () {
                return this.xPos + this.width > 0;
            },

            /**
             * Make a copy of the collision boxes, since these will change based on
             * Block type and size.
             */
            cloneHitBoxes: function () {
                var collisionBoxes = this.typeConfig.collisionBoxes;

                for (var i = collisionBoxes.length - 1; i >= 0; i--) {
                    this.collisionBoxes[i] = new HitBox(collisionBoxes[i].x,
                        collisionBoxes[i].y, collisionBoxes[i].width,
                        collisionBoxes[i].height);
                }
            }
        };


    /**
     * Block definitions.
     * minGap: minimum pixel space betweeen Blocks.
     * multipleSpeed: Speed at which multiples are allowed.
     * speedOffset: speed faster / slower than the horizon.
     * minSpeed: Minimum speed which the Block can make an appearance.
     */
    Block.types = [
        {
            type: 'OBSTACLE_SMALL',
            width: 17,
            height: 35,
            yPos: 105,
            multipleSpeed: 4,
            minGap: 120,
            minSpeed: 0,
            collisionBoxes: [
                new HitBox(0, 7, 5, 27),
                new HitBox(4, 0, 6, 34),
                new HitBox(10, 4, 7, 14)
            ]
        },
        {
            type: 'OBSTACLE_LARGE',
            width: 25,
            height: 50,
            yPos: 90,
            multipleSpeed: 7,
            minGap: 120,
            minSpeed: 0,
            collisionBoxes: [
                new HitBox(0, 12, 7, 38),
                new HitBox(8, 0, 7, 49),
                new HitBox(13, 10, 10, 38)
            ]
        },
        {
            type: 'BIRD',
            width: 46,
            height: 40,
            yPos: [100, 75, 50], // Variable height.
            multipleSpeed: 999,
            minSpeed: 8.5,
            minGap: 150,
            collisionBoxes: [
                new HitBox(15, 15, 16, 5),
                new HitBox(18, 21, 24, 6),
                new HitBox(2, 14, 4, 3),
                new HitBox(6, 10, 4, 7),
                new HitBox(10, 8, 6, 9)
            ],
            numFrames: 2,
            frameRate: 1000 / 6,
            speedOffset: .8
        }
    ];


    //******************************************************************************
    /**
     * Nomad Boy game character.
     * @param {HTMLCanvas} canvas
     * @param {Object} spritePos Positioning within image sprite.
     * @constructor
     */
    function Boy(canvas, spritePos) {
        this.canvas = canvas;
        this.canvasContainer = canvas.getContext('2d');
        this.spritePos = spritePos;
        this.xPos = 0;
        this.yPos = 0;
        // Position when on the ground.
        this.groundYPos = 0;
        this.currentFrame = 0;
        this.currentAnimFrames = [];
        this.blinkDelay = 0;
        this.blinkCount = 0;
        this.animStartTime = 0;
        this.timer = 0;
        this.msPerFrame = 1000 / FPS;
        this.values = Boy.values;
        // Current status.
        this.status = Boy.status.WAITING;

        this.jumping = false;
        this.ducking = false;
        this.jumpVelocity = 0;
        this.reachedMinHeight = false;
        this.speedDrop = false;
        this.jumpCount = 0;
        this.jumpspotX = 0;

        this.init();
    };


    /**
     * Nomad Boy player config.
     * @enum {number}
     */
    Boy.values = {
        DROP_VELOCITY: -5,
        GRAVITY: 0.6,
        HEIGHT: 47,
        HEIGHT_DUCK: 25,
        INIITAL_JUMP_VELOCITY: -10,
        INTRO_DURATION: 1500,
        MAX_JUMP_HEIGHT: 30,
        MIN_JUMP_HEIGHT: 30,
        SPEED_DROP_COEFFICIENT: 3,
        SPRITE_WIDTH: 262,
        START_X_POS: 50,
        WIDTH: 44,
        WIDTH_DUCK: 59
    };


    /**
     * Used in collision detection.
     * @type {Array<CollisionBox>}
     */
    Boy.collisionBoxes = {
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


    /**
     * Animation states.
     * @enum {string}
     */
    Boy.status = {
        CRASHED: 'CRASHED',
        DUCKING: 'DUCKING',
        JUMPING: 'JUMPING',
        RUNNING: 'RUNNING',
        WAITING: 'WAITING'
    };

    /**
     * Blinking coefficient.
     * @const
     */
    Boy.BLINK_TIMING = 7000;

    /**
     * Animation config for different states.
     * @enum {Object}
     */
    Boy.animFrames = {
        WAITING: {
            frames: [44, 0],
            msPerFrame: 1000 / 3
        },
        RUNNING: {
            frames: [88, 132],
            msPerFrame: 1000 / 12
        },
        CRASHED: {
            frames: [220],
            msPerFrame: 1000 / 60
        },
        JUMPING: {
            frames: [0],
            msPerFrame: 1000 / 60
        },
        DUCKING: {
            frames: [262, 321],
            msPerFrame: 1000 / 8
        }
    };


    Boy.prototype = {
        /**
         * Nomad Boy player initaliser.
         * Sets the t-rex to blink at random intervals.
         */
        init: function () {
            this.groundYPos = Nomad.defaultSizes.HEIGHT - this.values.HEIGHT -
                Nomad.values.BOTTOM_PAD;
            this.yPos = this.groundYPos;
            this.minJumpHeight = this.groundYPos - this.values.MIN_JUMP_HEIGHT;

            this.draw(0, 0);
            this.update(0, Boy.status.WAITING);
        },

        /**
         * Setter for the jump velocity.
         * The approriate drop velocity is also set.
         */
        setJumpSpeed: function (setting) {
            this.values.INIITAL_JUMP_VELOCITY = -setting;
            this.values.DROP_VELOCITY = -setting / 2;
        },

        /**
         * Set the animation status.
         * @param {!number} deltaTime
         * @param {Boy.status} status Optional status to switch to.
         */
        update: function (deltaTime, opt_status) {
            this.timer += deltaTime;

            // Update the status.
            if (opt_status) {
                this.status = opt_status;
                this.currentFrame = 0;
                this.msPerFrame = Boy.animFrames[opt_status].msPerFrame;
                this.currentAnimFrames = Boy.animFrames[opt_status].frames;

                if (opt_status == Boy.status.WAITING) {
                    this.animStartTime = getCurrTime();
                    this.setBlinking();
                }
            }

            // Game intro animation, T-rex moves in from the left.
            if (this.intro && this.xPos < this.values.START_X_POS) {
                this.xPos += Math.round((this.values.START_X_POS /
                    this.values.INTRO_DURATION) * deltaTime);
            }

            if (this.status == Boy.status.WAITING) {
                this.blink(getCurrTime());
            } else {
                this.draw(this.currentAnimFrames[this.currentFrame], 0);
            }

            // Update the frame position.
            if (this.timer >= this.msPerFrame) {
                this.currentFrame = this.currentFrame ==
                    this.currentAnimFrames.length - 1 ? 0 : this.currentFrame + 1;
                this.timer = 0;
            }

            // Speed drop becomes duck if the down key is still being pressed.
            if (this.speedDrop && this.yPos == this.groundYPos) {
                this.speedDrop = false;
                this.setDuck(true);
            }
        },

        /**
         * Draw the nomad to a particular position.
         * @param {number} x
         * @param {number} y
         */
        draw: function (x, y) {
            var sourceX = x;
            var sourceY = y;
            var sourceWidth = this.ducking && this.status != Boy.status.CRASHED ?
                this.values.WIDTH_DUCK : this.values.WIDTH;
            var sourceHeight = this.values.HEIGHT;

            if (IS_HIDPI) {
                sourceX *= 2;
                sourceY *= 2;
                sourceWidth *= 2;
                sourceHeight *= 2;
            }

            // Adjustments for sprite sheet position.
            sourceX += this.spritePos.x;
            sourceY += this.spritePos.y;

            // Ducking.
            if (this.ducking && this.status != Boy.status.CRASHED) {
                this.canvasContainer.drawImage(Nomad.imageSprite, sourceX, sourceY,
                    sourceWidth, sourceHeight,
                    this.xPos, this.yPos,
                    this.values.WIDTH_DUCK, this.values.HEIGHT);
            } else {
                // Crashed whilst ducking. Boy is standing up so needs adjustment.
                if (this.ducking && this.status == Boy.status.CRASHED) {
                    this.xPos++;
                }
                // Standing / running
                this.canvasContainer.drawImage(Nomad.imageSprite, sourceX, sourceY,
                    sourceWidth, sourceHeight,
                    this.xPos, this.yPos,
                    this.values.WIDTH, this.values.HEIGHT);
            }
        },

        /**
         * Sets a random time for the blink to happen.
         */
        setBlinking: function () {
            this.blinkDelay = Math.ceil(Math.random() * Boy.BLINK_TIMING);
        },

        /**
         * Make t-rex blink at random intervals.
         * @param {number} time Current time in milliseconds.
         */
        blink: function (time) {
            var deltaTime = time - this.animStartTime;

            if (deltaTime >= this.blinkDelay) {
                this.draw(this.currentAnimFrames[this.currentFrame], 0);

                if (this.currentFrame == 1) {
                    // Set new random delay to blink.
                    this.setBlinking();
                    this.animStartTime = time;
                    this.blinkCount++;
                }
            }
        },

        /**
         * Initialise a jump.
         * @param {number} speed
         */
        startJump: function (speed) {
            if (!this.jumping) {
                this.update(0, Boy.status.JUMPING);
                // Tweak the jump velocity based on the speed.
                this.jumpVelocity = this.values.INIITAL_JUMP_VELOCITY - (speed / 10);
                this.jumping = true;
                this.reachedMinHeight = false;
                this.speedDrop = false;
            }
        },

        /**
         * Jump is complete, falling down.
         */
        endJump: function () {
            if (this.reachedMinHeight &&
                this.jumpVelocity < this.values.DROP_VELOCITY) {
                this.jumpVelocity = this.values.DROP_VELOCITY;
            }
        },

        /**
         * Update frame for a jump.
         * @param {number} deltaTime
         * @param {number} speed
         */
        updateJump: function (deltaTime, speed) {
            var msPerFrame = Boy.animFrames[this.status].msPerFrame;
            var framesElapsed = deltaTime / msPerFrame;

            // Speed drop makes Boy fall faster.
            if (this.speedDrop) {
                this.yPos += Math.round(this.jumpVelocity *
                    this.values.SPEED_DROP_COEFFICIENT * framesElapsed);
            } else {
                this.yPos += Math.round(this.jumpVelocity * framesElapsed);
            }

            this.jumpVelocity += this.values.GRAVITY * framesElapsed;

            // Minimum height has been reached.
            if (this.yPos < this.minJumpHeight || this.speedDrop) {
                this.reachedMinHeight = true;
            }

            // Reached max height
            if (this.yPos < this.values.MAX_JUMP_HEIGHT || this.speedDrop) {
                this.endJump();
            }

            // Back down at ground level. Jump completed.
            if (this.yPos > this.groundYPos) {
                this.reset();
                this.jumpCount++;
            }

            this.update(deltaTime);
        },

        /**
         * Set the speed drop. Immediately cancels the current jump.
         */
        setDropSpeed: function () {
            this.speedDrop = true;
            this.jumpVelocity = 1;
        },

        /**
         * @param {boolean} isDucking.
         */
        setDuck: function (isDucking) {
            if (isDucking && this.status != Boy.status.DUCKING) {
                this.update(0, Boy.status.DUCKING);
                this.ducking = true;
            } else if (this.status == Boy.status.DUCKING) {
                this.update(0, Boy.status.RUNNING);
                this.ducking = false;
            }
        },

        /**
         * Reset the nomad to running at start of game.
         */
        reset: function () {
            this.yPos = this.groundYPos;
            this.jumpVelocity = 0;
            this.jumping = false;
            this.ducking = false;
            this.update(0, Boy.status.RUNNING);
            this.midair = false;
            this.speedDrop = false;
            this.jumpCount = 0;
        }
    };



    function distanceCalc(canvas, spritePos, canvasWidth) {
        this.canvas = canvas;
        this.canvasContainer = canvas.getContext('2d');
        this.image = Nomad.imageSprite;
        this.spritePos = spritePos;
        this.x = 0;
        this.y = 5;

        this.currentDistance = 0;
        this.maxScore = 0;
        this.highScore = 0;
        this.container = null;

        this.digits = [];
        this.acheivement = false;
        this.defaultString = '';
        this.flashTimer = 0;
        this.flashIterations = 0;
        this.invertTrigger = false;

        this.values = distanceCalc.values;
        this.maxScoreUnits = this.values.MAX_DISTANCE_UNITS;
        this.init(canvasWidth);
    };



    distanceCalc.defaultSizes = {
        WIDTH: 10,
        HEIGHT: 13,
        DEST_WIDTH: 11
    };



    distanceCalc.yPos = [0, 13, 27, 40, 53, 67, 80, 93, 107, 120];


    distanceCalc.values = {
       
        MAX_DISTANCE_UNITS: 5,

        
        ACHIEVEMENT_DISTANCE: 100,

       
        COEFFICIENT: 0.025,

       
        FLASH_DURATION: 1000 / 4,

        
        FLASH_ITERATIONS: 3
    };


    distanceCalc.prototype = {

        init: function (width) {
            var maxDistanceStr = '';

            this.calculateX(width);
            this.maxScore = this.maxScoreUnits;
            for (var i = 0; i < this.maxScoreUnits; i++) {
                this.draw(i, 0);
                this.defaultString += '0';
                maxDistanceStr += '9';
            }

            this.maxScore = parseInt(maxDistanceStr);
        },

   
        calculateX: function (canvasWidth) {
            this.x = canvasWidth - (distanceCalc.defaultSizes.DEST_WIDTH *
                (this.maxScoreUnits + 1));
        },


        draw: function (digitPos, value, opt_highScore) {
            var sourceWidth = distanceCalc.defaultSizes.WIDTH;
            var sourceHeight = distanceCalc.defaultSizes.HEIGHT;
            var sourceX = distanceCalc.defaultSizes.WIDTH * value;
            var sourceY = 0;

            var targetX = digitPos * distanceCalc.defaultSizes.DEST_WIDTH;
            var targetY = this.y;
            var targetWidth = distanceCalc.defaultSizes.WIDTH;
            var targetHeight = distanceCalc.defaultSizes.HEIGHT;

            if (IS_HIDPI) {
                sourceWidth *= 2;
                sourceHeight *= 2;
                sourceX *= 2;
            }

            sourceX += this.spritePos.x;
            sourceY += this.spritePos.y;

            this.canvasContainer.save();

            if (opt_highScore) {
                   var highScoreX = this.x - (this.maxScoreUnits * 2) *
                    distanceCalc.defaultSizes.WIDTH;
                this.canvasContainer.translate(highScoreX, this.y);
            } else {
                this.canvasContainer.translate(this.x, this.y);
            }

            this.canvasContainer.drawImage(this.image, sourceX, sourceY,
                sourceWidth, sourceHeight,
                targetX, targetY,
                targetWidth, targetHeight
            );

            this.canvasContainer.restore();
        },


        getDist: function (distance) {
            return distance ? Math.round(distance * this.values.COEFFICIENT) : 0;
        },


        update: function (deltaTime, distance) {
            var paint = true;
            var playSound = false;

            if (!this.acheivement) {
                distance = this.getDist(distance);
                
                if (distance > this.maxScore && this.maxScoreUnits ==
                    this.values.MAX_DISTANCE_UNITS) {
                    this.maxScoreUnits++;
                    this.maxScore = parseInt(this.maxScore + '9');
                } else {
                    this.distance = 0;
                }

                if (distance > 0) {
                    
                    if (distance % this.values.ACHIEVEMENT_DISTANCE == 0) {
                        
                        this.acheivement = true;
                        this.flashTimer = 0;
                        playSound = true;
                    }

                    
                    var distanceStr = (this.defaultString +
                        distance).substr(-this.maxScoreUnits);
                    this.digits = distanceStr.split('');
                } else {
                    this.digits = this.defaultString.split('');
                }
            } else {
                
                if (this.flashIterations <= this.values.FLASH_ITERATIONS) {
                    this.flashTimer += deltaTime;

                    if (this.flashTimer < this.values.FLASH_DURATION) {
                        paint = false;
                    } else if (this.flashTimer >
                        this.values.FLASH_DURATION * 2) {
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
                distance).substr(-this.maxScoreUnits);

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
            var sourceWidth = Clouds.values.WIDTH;
            var sourceHeight = Clouds.values.HEIGHT;

            if (IS_HIDPI) {
                sourceWidth = sourceWidth * 2;
                sourceHeight = sourceHeight * 2;
            }

            this.canvasContainer.drawImage(Nomad.imageSprite, this.spritePos.x,
                this.spritePos.y,
                sourceWidth, sourceHeight,
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
            this.canvasContainer.drawImage(Nomad.imageSprite, this.sourceXPos[0],
                this.spritePos.y,
                this.sourceDimensions.WIDTH, this.sourceDimensions.HEIGHT,
                this.xPos[0], this.yPos,
                this.defaultSizes.WIDTH, this.defaultSizes.HEIGHT);

            this.canvasContainer.drawImage(Nomad.imageSprite, this.sourceXPos[1],
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
        this.cloudFrequency = this.values.CLOUD_FREQUENCY;
        this.spritePos = spritePos;
        this.clouds = [];
        this.cloudSpeed = this.values.BG_CLOUD_SPEED;
        this.horizonLine = null;
        this.init();
    };


    Space.values = {
        BG_CLOUD_SPEED: 0.2,
        BUMPY_THRESHOLD: .3,
        CLOUD_FREQUENCY: .5,
        HORIZON_HEIGHT: 16,
        MAX_CLOUDS: 6
    };


    Space.prototype = {
        init: function () {
            this.addCloud();
            this.horizonLine = new Land(this.canvas, this.spritePos.HORIZON);
   
        },

        update: function (deltaTime, currentSpeed, updateBox, showNightMode) {
            this.runningTime += deltaTime;
            this.horizonLine.update(deltaTime, currentSpeed);
            this.updateClouds(deltaTime, currentSpeed);

            if (updateBox) {
                this.updateBox(deltaTime, currentSpeed);
            }
        },

        updateClouds: function (deltaTime, speed) {
            var cloudSpeed = this.cloudSpeed / 1000 * deltaTime * speed;
            var numClouds = this.clouds.length;

            if (numClouds) {
                for (var i = numClouds - 1; i >= 0; i--) {
                    this.clouds[i].update(cloudSpeed);
                }

                var lastCloud = this.clouds[numClouds - 1];

                if (numClouds < this.values.MAX_CLOUDS &&
                    (this.defaultSizes.WIDTH - lastCloud.xPos) > lastCloud.cloudGap &&
                    this.cloudFrequency > Math.random()) {
                    this.addCloud();
                }

                this.clouds = this.clouds.filter(function (obj) {
                    return !obj.remove;
                });
            } else {
                this.addCloud();
            }
        },

        updateBox: function (deltaTime, currentSpeed) {
            var updatedBlocks = this.Blocks.slice(0);

            for (var i = 0; i < this.Blocks.length; i++) {
                var Block = this.Blocks[i];
                Block.update(deltaTime, currentSpeed);

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
                    this.addBox(currentSpeed);
                    lastBlock.followingBlockCreated = true;
                }
            } else {
                this.addBox(currentSpeed);
            }
        },

        removeFirstBox: function () {
            this.Blocks.shift();
        },

        addBox: function (currentSpeed) {
            var BlockTypeIndex = randomNumGen(0, Block.types.length - 1);
            var BlockType = Block.types[BlockTypeIndex];

            if (this.checkBox(BlockType.type) ||
                currentSpeed < BlockType.minSpeed) {
                this.addBox(currentSpeed);
            } else {
                var BlockSpritePos = this.spritePos[BlockType.type];

                this.Blocks.push(new Block(this.canvasContainer, BlockType,
                    BlockSpritePos, this.defaultSizes,
                    this.gapCoefficient, currentSpeed, BlockType.width));

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
