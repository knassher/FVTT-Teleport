    Hooks.once("init", async function() {
        if (game.modules.get("furnace") && game.modules.get("furnace").active) {
            FurnacePatching.replaceMethod(Note,"_onDoubleLeft",teleportpoint._onDoubleLeft);
            FurnacePatching.replaceMethod(Note,"_onDoubleRight",teleportpoint._onDoubleRight);

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
            game.Teleport = {
                                point: teleportpoint,
                                getTeleportPoints: TeleportSheetConfig.getTeleportPoints,
                                getTeleportPoint: TeleportSheetConfig.getTeleportPoint,
                                getTokensQuadrant: TeleportSheetConfig.getTokensQuadrant,
                                getQuadrants: TeleportSheetConfig.getQuadrants,
                                getTokenstoMove: TeleportSheetConfig.getTokenstoMove
                            };
            await loadTPIcons();
            TeleportSheetConfig.registerSettings();
            console.log(`Teleport | Initializing Teleport module for FoundryVTT is completed.`);
        }
        else {
            console.log(`Teleport | Furnace module not enabled, Teleport module not loaded.`);
            ui.notifications.error("Please install Furnace if you want to use Teleport.")
        }
    });

    /**
    * Hook that set the mouseUp handler for the board div.
    **/
    Hooks.once("ready", () => {
        const board = $(document.getElementById("board"));
        board.on("mouseup",e => teleportpoint._onMouseUp(e));
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
        teleportpoint.getSceneControlButtons(controls);
    });

    /**
    * Hooks fired when deleting a note.
    **/

    Hooks.on("deleteNote", (scene, sceneId, data, options, userId) =>{
        return canvas.activeLayer._hover ? canvas.activeLayer._hover = null : null;
    });

    /**
    * Hooks fired on the player side when the position of a existing token is updated, also the hooks
    * center the player's view on the teleported token.
    **/
    Hooks.on("updateToken", async (scene, sceneId, data, options, userId) => {
        //console.log("DEBUG TELEPORT | updateToken",sceneId,data,options);
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
            console.log("Teleport | Scene ", scene.name ," was preloaded.");
        }
        if (canvas.scene._id !== scene._id){
            setTimeout(async () => {
                console.log("Waiting!");
                await scene.view();
                const note = scene.getEmbeddedEntity("Note",noteTo);
                await canvas.animatePan({x:note.x,y:note.y,scale:1,duration:10});
                }, 5000);
        }
        ui.notifications.info("Your DM has teleported your token to the scene " + scene.name + ", wait until is completed.");
    });

    async function loadTPIcons() {
        let toLoad = [];

        toLoad = toLoad.concat(Object.values(CONFIG.Teleport.noteIcons));

        return TextureLoader.loader.load(toLoad, {message: `Loading Teleport Points Icons`});
    }
