    Hooks.once("init", function() {
        let furnace = game.modules.get("furnace").active;

        if (furnace) {
            FurnacePatching.replaceMethod(Note,"_onDoubleLeft",st._onDoubleLeft);
            FurnacePatching.replaceMethod(Note,"_onDoubleRight",st._onDoubleRight);

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
            console.log(`Teleport | Initializing Teleport module for FoundryVTT.`);
        }
        else {
            console.log(`Teleport | Furnace module not enabled, Teleport module not loaded.`);
        };
    });

    Hooks.on('getSceneControlButtons', controls => {
        st.getSceneControlButtons(controls);
    });

    //Note hook
    /**
     * Hook on delete note to fix core bug with hover not being cleared on delete
     */
    Hooks.on("deleteNote", (scene, sceneId, data, options, userId) =>{
        return canvas.activeLayer._hover ? canvas.activeLayer._hover = null : null;
    });

    //Hooks for Note sheet and Scene Transition sheet
    /**
     * Hook on note config render to inject filepicker and remove selector
     */
    Hooks.on("renderTeleportSheetConfig", (app, html, data) => {
        const iconSelector = html.find("select[name='sceneId']")[0];
        iconSelector.onchange = st._onChange.bind(null,event,html);
    });

    Hooks.on("updateToken", async (scene, sceneID, updateData, options, userId) => {
        if (!game.user.isGM && options && options.teleported) {
            canvas.tokens.releaseAll();
            let tokentopan = canvas.tokens.get(updateData._id);
            if (! tokentopan.owner) return;
            console.log("Teleport | Teleporting name: ", tokentopan.name,", id: ",tokentopan.id, ", event: 2");
            tokentopan.control({releaseOthers:false});
            await canvas.animatePan({x:tokentopan.coords[0],y:tokentopan.coords[1],scale:1,duration:10});
            tokentopan._noAnimate = false;
        }
    });

    Hooks.on("preUpdateToken", async (scene, sceneId, actorData, options) => {
        if (!game.user.isGM && options && options.teleported) {
            let tokentopan = canvas.tokens.get(actorData._id);
            if (! tokentopan.owner) return;
            tokentopan._noAnimate = true;
            await game.scenes.preload(sceneId)
        }
    });

    Hooks.on("preCreateToken", async (scene, sceneId, actorData, options) => {
        if (!game.user.isGM && options && options.teleported) {
            await game.scenes.preload(sceneId)
        }
    });

    Hooks.on("createToken", async (scene, sceneID, tokenData, options, userId) => {
        if (!game.user.isGM && options && options.teleported) {
            console.log("Teleport | Teleporting name: ", tokenData.name,", id: ", tokenData._id, ", event: 1");
            let sceneto = game.scenes.get(sceneID);
            if (scene._id != canvas.scene._id) {
                await sceneto.view();
            }
            await canvas.animatePan({x:tokenData.x,y:tokenData.y,scale:1,duration:10});
            canvas.tokens.releaseAll();
            canvas.tokens.get(tokenData._id).control({releaseOthers:false});
        }
    });