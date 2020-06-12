    Hooks.once("init", async function() {
        Note.prototype._onClickLeft2 = teleportpoint._onDoubleLeft
        Note.prototype._onClickRight2 = teleportpoint._onDoubleRight
        KeyboardManager.prototype._handleMovement = teleportpoint._handleMovement;
        Token.prototype.animateMovement = teleportpoint._animateMovement;

        // Adding Icons for TeleportSheetConfig sheet
        CONFIG.Teleport = {
                                    noteIcons: {
                                      "Bridge": "modules/teleport/icons/bridge.svg",
                                      "Cave": "modules/teleport/icons/cave.svg",
                                      "Castle": "modules/teleport/icons/castle.svg",
                                      "City": "modules/teleport/icons/city.svg",
                                      "House": "modules/teleport/icons/house.svg",
                                      "Ladder": "modules/teleport/icons/ladder.svg",
                                      "Mountain": "modules/teleport/icons/mountain.svg",
                                      "Oak Tree": "modules/teleport/icons/oak.svg",
                                      "Obelisk": "modules/teleport/icons/obelisk.svg",
                                      "Ruins": "modules/teleport/icons/ruins.svg",
                                      "Statue": "modules/teleport/icons/statue.svg",
                                      "Stairs": "modules/teleport/icons/3d-stairs.svg",
                                      "Temple": "modules/teleport/icons/temple.svg",
                                      "Tower": "modules/teleport/icons/tower.svg",
                                      "Village": "modules/teleport/icons/village.svg",
                                      "Waterfall": "modules/teleport/icons/waterfall.svg",
                                      "Windmill": "modules/teleport/icons/windmill.svg",
                                      "Wooden Door": "modules/teleport/icons/wooden-door.svg"
                                    },
                                    defaultIcon: "modules/teleport/icons/3d-stairs.svg"
                        };
        game.teleport = {
                            tp: teleportpoint
                        };
        //Load icons used on the TP sheet config.
        await loadTPIcons();

        //Register settings
        game.settings.register("teleport", "hidedepartingtokens", {
            name: "Hide Departing Tokens",
            hint: "Hide tokens on the original scene when you teleport them to a new one.",
            scope: "world",
            type: Boolean,
            config: true,
            default: false
        });

        game.settings.register("teleport", "toggleaddtpbutton", {
          name: "Toggle Add TP",
          hint: "Keep track of the Add TP button's state",
          scope: "client",
          config: false,
          default: false,
          type: Boolean
        });

        console.log(`Teleport | Initializing Teleport module for FoundryVTT is completed.`);
    });

    /**
    * Hook that set the mouseUp handler for the board div.
    **/
    Hooks.once("ready", () => {
        const board = $(document.getElementById("board"));
        board.on("mouseup",e => teleportpoint._onMouseUp(e));
        teleportpoint._oldOnClickLeft2 = NotesLayer.prototype._onClickLeft2;
        game.settings.set("teleport","toggleaddtpbutton",false);
        teleportpoint.socketListeners(game.socket);
    });

    /**
    * Hook that set loaded flag for the a scene.
    **/
    Hooks.on("canvasReady", canvas => {
        canvas.scene.options["loaded"] = true;
    });

    /**
    * Hook that set the "Add Teleport Point on the Note controls bar"
    **/
    Hooks.on('getSceneControlButtons', controls => {
        let noteButton = controls.find(b => b.name === "notes");

        if (noteButton) {
            noteButton.tools.push({
                name: "teleportation",
                title: "Toggle Add Teleportation Point",
                icon: "fab fa-firstdraft",
                toggle: true,
                active: game.settings.get("teleport","toggleaddtpbutton"),
                visible: game.user.isGM,
                onClick: (value) => {
                    game.settings.set("teleport","toggleaddtpbutton", !(game.settings.get("teleport","toggleaddtpbutton")));
                    if (game.settings.get("teleport","toggleaddtpbutton")) {
                        NotesLayer.prototype._onClickLeft2 = teleportpoint._onDoubleClick;
                    }
                    else {
                        NotesLayer.prototype._onClickLeft2 = teleportpoint._oldOnClickLeft2;
                    }
                }
            });
        }
    });

    /**
    * Hooks fired when deleting a note.
    **/

    Hooks.on("deleteNote", (scene, sceneId, data, options, userId) =>{
        return canvas.activeLayer._hover ? canvas.activeLayer._hover = null : null;
    });

    /**
    * Hooks fired on the player side when a new token is created, also the hooks center the
    * player's view on the teleported token.
    **/

    Hooks.on("teleportation",async (sceneTo,noteTo,result,userId) =>{
        if (game.user.isGM) return;
        if (result) return;
        const scene = game.scenes.get(sceneTo);
        if (!scene.options["loaded"]) {
            await game.scenes.preload(sceneTo)
            scene.options["loaded"] = true;
            console.log("Teleport | Scene ", scene.data.navName ," was preloaded."); // May not be necessary to change this as it is in the console, not a popup
        }
        const note = scene.getEmbeddedEntity("Note",noteTo);
        if (canvas.scene._id !== scene._id){
            setTimeout(async () => {
                await scene.view();
                await canvas.animatePan({x:note.x,y:note.y,scale:1,duration:10});
                }, 6000);
            ui.notifications.info("Your DM has teleported your token to the scene " + scene.data.navName + ", wait until is completed.");
        }
        else {
            setTimeout(async () => {
                await canvas.animatePan({x:note.x,y:note.y,scale:1,duration:10});
                }, 3000);
            ui.notifications.info("Your DM has teleported your token to " + note.text + ", wait until is completed.");
        }
    });

    async function loadTPIcons() {
        let toLoad = [];

        toLoad = toLoad.concat(Object.values(CONFIG.Teleport.noteIcons));

        return TextureLoader.loader.load(toLoad, {message: `Loading Teleport Points Icons`});
    }