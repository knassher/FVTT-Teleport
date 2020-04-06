    Hooks.once("init", async function() {
        if (game.modules.get("furnace") && game.modules.get("furnace").active) {
            FurnacePatching.replaceMethod(Note,"_onDoubleLeft",teleportpoint._onDoubleLeft);
            FurnacePatching.replaceMethod(Note,"_onDoubleRight",teleportpoint._onDoubleRight);
            //This patch is to fix cases when the controlIcon of a note doesn't have a border defined.
            const f = FurnacePatching.patchClass(PlaceableObject,PlaceableObject.prototype._onMouseOver,11,
                "if ( this.controlIcon ) this.controlIcon.border.visible = true;",
                "if ( this.controlIcon && this.controlIcon.border ) this.controlIcon.border.visible = true;");
            FurnacePatching.replaceMethod(PlaceableObject,"_onMouseOver",f.prototype._onMouseOver);

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
            console.log(`Teleport | Initializing Teleport module for FoundryVTT is completed.`);
        }
        else {
            console.log(`Teleport | Furnace module not enabled, Teleport module not loaded.`);
            ui.notifications.error("Please install Furnace if you want to use Teleport.")
        }
    });

    Hooks.once("ready", () => {
        canvas.scene.options["loaded"] = true;
    });

    /**
     * Hook that set the "Add Teleport Point on the Note controls bar"
     **/
    Hooks.on('getSceneControlButtons', controls => {
        teleportpoint.getSceneControlButtons(controls);
    });

    /**
     * Hook on delete note to fix core bug with hover not being cleared on delete
     **/
    Hooks.on("deleteNote", (scene, sceneId, data, options, userId) =>{
        return canvas.activeLayer._hover ? canvas.activeLayer._hover = null : null;
    });

    /**
     * Hooks for TelportSheetConfig rendering, it will assign the method that will handle the
     * onChange event of the scene listbox control.
     **/
    Hooks.on("renderTeleportSheetConfig", (app, html, data) => {
        const sceneSelector = html.find("select[name='sceneId']")[0];
        sceneSelector.onchange = teleportpoint._onChange.bind(null,event,html);
    });

    /**
     * Hooks fired on the player side when the position of a existing token is updated, also the hooks
     * center the player's view on the teleported token.
     **/

    //This hook will center the view on the teleported token, will open the scene if the destination point is
    //in a different scene and also will restore movement animation for the token.
    Hooks.on("updateToken", async (scene, sceneID, updateData, options, userId) => {
        if (!options) return;
        if (!game.user.isGM && options.pcTriggered && options.teleported) {
            let tokentopan = canvas.tokens.get(updateData._id);
            if (! tokentopan.owner) return;
            console.log("Teleport | Teleporting token: ", tokentopan.name,", to scene: ",scene.name, ", event: 2");
            let sceneto = game.scenes.get(sceneID);
            if (sceneto._id != canvas.scene._id) {
                await sceneto.view();
            }
            await canvas.animatePan({x:tokentopan.coords[0],y:tokentopan.coords[1],scale:1,duration:10});
            tokentopan._noAnimate = false;
            canvas.tokens.releaseAll();
            tokentopan.control({releaseOthers:false});
        }
    });

    // This hook will preload the scene to avoid any issues with textures that didn't load. It also disables
    // the animation movement of the token.
    Hooks.on("preUpdateToken", async (scene, sceneId, actorData, options) => {
        if (!game.user.isGM && options && options.teleported && !game.scenes.get(sceneId).options["loaded"]) {
            let tokentopan = canvas.tokens.get(actorData._id);
            if (! tokentopan.owner) return;
            tokentopan._noAnimate = true;
            await game.scenes.preload(sceneId)
            game.scenes.get(sceneId).options["loaded"] = true;
            console.log("Teleport | Scene ", scene.name ," was preloaded.");
        }
    });

    /**
     * Hooks fired on the player side when a new token is created, also the hooks center the
     * player's view on the teleported token.
     **/

    // This hook will preload the scene to avoid any issues with textures that didn't load.
    Hooks.on("preCreateToken", async (scene, sceneId, actorData, options) => {
        if (!game.user.isGM && options && options.teleported && !game.scenes.get(sceneId).options["loaded"]) {
            await game.scenes.preload(sceneId)
            game.scenes.get(sceneId).options["loaded"] = true;
            console.log("Teleport | Scene ", scene.name ," was preloaded.");
        }
    });

    // This hook will open the new scene and focus the view on the last teleported token.
    Hooks.on("createToken", async (scene, sceneID, tokenData, options, userId) => {
        if (!options) return;
        if (!game.user.isGM && options.pcTriggered && options.teleported) {
            let tokentopan = canvas.tokens.get(tokenData._id);
            if (! tokentopan.owner) return;
            console.log("Teleport | Teleporting token: ", tokenData.name,", to scene: ", scene.name, ", event: 1");
            let sceneto = game.scenes.get(sceneID);
            if (sceneto._id != canvas.scene._id) {
                await sceneto.view();
            }
            await canvas.animatePan({x:tokenData.x,y:tokenData.y,scale:1,duration:10});
            canvas.tokens.releaseAll();
            tokentopan.control({releaseOthers:false});
        }
    });


    async function loadTPIcons() {
        const loader = PIXI.Loader.shared;
        let toLoad = [];

        toLoad = toLoad.concat(Object.values(CONFIG.Teleport.noteIcons));

        toLoad = new Array(...new Set(toLoad.filter(t => !loader.resources.hasOwnProperty(t))));
        const valid = new Set();
        for ( let f of toLoad ) {
        // FIXME: Cache bust any/all SVG images to avoid them becoming tiny
        const isSVG = /\.svg/.test(f);
        if ( isSVG ) f = f.split("?")[0] + `?${randomID(8)}`;
        valid.add(f);
        }

        loader.add(Array.from(valid), RESOURCE_LOADER_OPTIONS);

        return new Promise((resolve, reject) => {
        loader.removeAllListeners();
        loader.on('progress', (loader, resource) => {
          let cacheName = resource.name.split("?").shift();
          loader.resources[cacheName] = loader.resources[resource.name];
          let pct = Math.round(loader.progress * 10) / 10;
          console.log(`${vtt} | Loaded ${cacheName} (${pct}%)`);
        });
        loader.on('error', (loader, resources, resource) => {
          console.warn(`${vtt} | Texture load failed for ${resource.name}`);
        });
        loader.load((loader, resources) => {
          resolve(resources);
        });
        });
    }