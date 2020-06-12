/**
 * A Teleport point is an implementation of PlaceableObject which represents an annotated location within the Scene.
 * Each Teleport point links to a Scene entity and represents it's location on the map.
 * @extends {PlaceableObject}
 *
 * @example
 * Note.create({
 *   entryId: scene.id,
 *   x: 1000,
 *   y: 1000,
 *   icon: "icons/my-journal-icon.svg",
 *   iconSize: 40,
 *   iconTint: "#00FF000",
 *   text: "A custom label",
 *   fontSize: 48,
 *   textAnchor: CONST.TEXT_ANCHOR_POINTS.CENTER,
 *   textColor: "#00FFFF",
 *   flags: {
 *              teleport: { sceneTo: "qwdq3q234fas",
 *                          noteTo: "gretewffvty31",
 *                          idText: "Custom Id text",
 *                          offset: []
 *                        }
 *          }
 * });
 */
    const TELEPORT_BUTTON = 1; //The middle button is the one that's going to be used for the drag&drop workflow to trigger
                           // a teleport event

    class TeleportPoint {
        constructor() {
            this._oldOnClickLeft2 = NotesLayer.prototype._onClickLeft2;
            this.animateMovement = Token.prototype.animateMovement;
        }
        get captureDialog() {
            return {
                content: `<div class="form-group"><p class="notes">Enter a name:</p></label><input name="name" type="text"></div></br>`,
                title: "Teleportation Point Name"
            }
        }

        socketListeners(socket) {
            socket.on("module.teleport",data => this._callHook(data));
        }

        async teleportTokens(sceneId,noteId,type=1){
            //Need this to clean the previous hovered note.
            canvas.activeLayer._hover = null;
            //Read flags from note and scene
            const sceneFrom = canvas.scene
            const sceneTo = game.scenes.get(sceneId);
            if (!sceneTo) return;
            const sceneToLoaded = sceneTo.options["loaded"];
            const sameScene = sceneTo._id === sceneFrom._id;
            const noteTo  = TeleportSheetConfig.getTeleportPoint(sceneId,noteId);
            const foct = canvas.tokens.controlled.filter(t => t.owner === true); //owened controlled tokens
            const toct = sceneTo.getEmbeddedCollection("Token");
            const ptokens = TeleportSheetConfig.getTokenstoMove(foct,toct);
            const ttokens = [];
            const notokens = foct.length === 0;
            const onetoken = foct.length === 1;
            const hide = game.settings.get("teleport","hidedepartingtokens");
            let arrival;
            let quadrants;
			let offsets;
            canvas.tokens.releaseAll();

            //Getting destination point
            if (noteTo) {
                arrival = { x:noteTo.x , y:noteTo.y, scale:1, duration: 10 };
				offsets =  noteTo.flags.teleport.offsets || [];
            }
            else {
                const dimensions = canvas.constructor.getDimensions(sceneTo.data);
                arrival = { x:dimensions.width / 2, y:dimensions.height / 2, scale:1, duration: 10  };
				offsets =  [];
            }
            //Getting offsets for tokens
            if (onetoken) quadrants = TeleportSheetConfig.getTokenQuadrant(offsets,arrival.x,arrival.y);
            else quadrants = TeleportSheetConfig.getTokensQuadrants(offsets,arrival.x,arrival.y,sceneTo.data.grid,
                        ptokens[0].length + ptokens[1].length);
            let cont = 0;
            const options = {embeddedName:"Token"};
            //...Update tokens in the scene
            $.each(ptokens[0], async function(i,t) {
                const coords = quadrants[cont];
                const data = {
                    _id: t._id,
                    x: coords.x,
                    y: coords.y,
                    hidden:false
                };
                ttokens.push(data._id);
                cont = cont + 1;
                try {
                    if (sameScene) await canvas.tokens.get(t._id).setFlag("teleport","noanimate",true);
                    await sceneTo.updateEmbeddedEntity("Token",data,options);
                    console.log("Teleport | Teleporting token: ", t.name,", to scene: ",sceneTo.name);
                }
                catch (err){}
                finally {
                    if (sameScene) await canvas.tokens.get(t._id).setFlag("teleport","noanimate",false);
                }
            });
            //...Create missing tokens in the scene
            $.each(ptokens[1], async function(i,t) {
                const data = duplicate(t);
                const coords = quadrants[cont];
                data.x = coords.x;
                data.y = coords.y;
                data.hidden = false;
                delete data._id
                cont = cont + 1;
                try {
                    const newtoken = await sceneTo.createEmbeddedEntity("Token",data,options);
                    ttokens.push(newtoken._id);
                    console.log("Teleport | Teleporting token: ", t.name,", to scene: ",sceneTo.name);
                }
                catch (err) {}
            });
            //...Hide tokens in original scene if there is a transition between scenes
            if (!sameScene && hide) {
                $.each(foct, async function(i,t) {
                    const data = {
                        _id: t.id,
                        hidden:true
                    };
                    try {
                        await sceneFrom.updateEmbeddedEntity("Token",data,options);
                    }
                    catch(err){}
                });
            }
            // Scene Transition
            if (game.user.isGM && !sameScene && !sceneToLoaded) {
                let preloaded = await game.scenes.preload(sceneTo._id);
                if (!preloaded) return ui.notifications.warn("Destination scene is not loaded yet. Please try again.");
                sceneTo.options["loaded"] = true;
                console.log("Teleport | Scene ", sceneTo.name ," was preloaded.");
            }
            if (game.user.isGM && !notokens) sceneTo.activate();
            if (!sameScene) {
                if (game.user.isGM && !notokens) await sceneTo.update({navigation: true});
                await sceneTo.view();
            }
            await canvas.animatePan(arrival);

            //control all teletransported tokens
            canvas.tokens.releaseAll();
            $.each(ttokens, async function(i,t) {
                canvas.tokens.get(t).control({releaseOthers: false});
            });
            //add canvas event for hoverin
            this.generateCanvasHoverInEvent();
            return notokens;
        }
        /* -------------------------------- Listeners ------------------------------- */

        /**
        * Handles doubleclicks left and right
        * @param {*} event
        */
        _onDoubleClick(event) {
            if (canvas.activeLayer.name !== "NotesLayer" || canvas.activeLayer._hover) return;
			try {
					let t = canvas.notes.worldTransform;
					const tx = (event.data.originalEvent.clientX - t.tx) / canvas.stage.scale.x;
					const ty = (event.data.originalEvent.clientY - t.ty) / canvas.stage.scale.y;
					const [x, y] = canvas.grid.getCenter(tx, ty);
					const data = {
					x: x,
					y: y
				};
				teleportpoint._createDialogST(data);
			}
			catch (err){
			}
        }

        async _onDoubleLeft(event) {
			if (!("teleport" in this.data.flags)){//If is a regular note, open journalentry sheet.
				const entry = this.entry;
				if ( entry ) entry.sheet.render(true);
			}
			else{
				const sceneTo = this.getFlag("teleport", "sceneTo");
				const noteTo =  this.getFlag("teleport", "noteTo");
				if (sceneTo) { //If is a transition note then send player to transition point.
					const result = await teleportpoint.teleportTokens(sceneTo,noteTo,1);
					await game.socket.emit("module.teleport", {scene:sceneTo,note:noteTo,result:result,userId:game.user.id}, resp => {});
				}
				else {
					ui.notifications.warn("A TeleportPoint is not config, please open the TPConfig sheet and set a Scene and/or Note.");
				}
			}
        }

        /** @override */
        _onDoubleRight(event) {
			let sheet;
			if (!("teleport" in this.data.flags)){//If is a regular note, open journalentry sheet.
				sheet = this.sheet;
			}
			else{
				sheet = new TeleportSheetConfig(this);
			}
			if ( sheet ) sheet.render(true);
        }

        /**
        * Handles mouseup event on the board div, this event will capture the position of the mouse
        * in de canvas and then fires the teleport event. This event won't affect any canvas, layer, placeable object
        * event.
        * @param {*} event
        */

        async _onMouseUp(event) {
            if (event.button !== TELEPORT_BUTTON) return;
            const transform = canvas.tokens.worldTransform;
            const coord = {
                x: (event.clientX - transform.tx) / canvas.stage.scale.x,
                y: (event.clientY - transform.ty) / canvas.stage.scale.y
            };
            const hit = TeleportSheetConfig.checkCollision(coord,canvas.scene.id);
            if (hit) {
                const note = canvas.notes.get(hit);
                const sceneTo = note.getFlag("teleport", "sceneTo");
                const noteTo =  note.getFlag("teleport", "noteTo");
                const result = await teleportpoint.teleportTokens(sceneTo,noteTo,1);
                await game.socket.emit("module.teleport", {scene:sceneTo,note:noteTo,result:result,userId:game.user.id}, resp => {});
            }
        }

        async _handleMovement(event, layer) {
            if ( !game.keyboard._moveKeys.size ) return;

            // Get controlled objects
            let objects = layer.placeables.filter(o => o._controlled);
            if ( objects.length === 0 ) return;

            // Define movement offsets and get moved directions
            const directions = game.keyboard._moveKeys;
            let dx = 0;
            let dy = 0;

            // Assign movement offsets
            if ( directions.has("left") ) dx -= 1;
            if ( directions.has("up") ) dy -= 1;
            if ( directions.has("right") ) dx += 1;
            if ( directions.has("down") ) dy += 1;
            game.keyboard._moveKeys.clear();

            // Perform the shift or rotation
            await layer.moveMany({dx, dy, rotate: event.shiftKey});

            //Check if a controlled token hits with a TP
            if (layer.name === "TokenLayer") {
                $.each(objects, async function(index,token) {
                    const coord = {
                        x: token.center.x,
                        y: token.center.y
                    };
                    const hit = TeleportSheetConfig.checkCollision(coord,canvas.scene.id);
                    if (hit) {
                        const note = canvas.notes.get(hit);
                        const sceneTo = note.getFlag("teleport", "sceneTo");
                        const noteTo =  note.getFlag("teleport", "noteTo");
                        const result = await teleportpoint.teleportTokens(sceneTo,noteTo,1);
                        await game.socket.emit("module.teleport", {scene:sceneTo,note:noteTo,result:result,userId:game.user.id}, resp => {});
                        return true;
                    }
                });
            }
        }
        /**
        * Animate Token movement along a certain path which is defined by a Ray object
        * @param {Ray} ray   The path along which to animate Token movement
        */
        async _animateMovement(ray) {

            // Move distance is 10 spaces per second
            this._movement = ray;
            let speed = canvas.dimensions.size * 10;
            let duration;
            if (this.getFlag("teleport","noanimate"))
                duration = 1;
            else
                duration = (ray.distance * 1000) / speed;

            // Define attributes
            const attributes = [
                { parent: this, attribute: 'x', to: ray.B.x },
                { parent: this, attribute: 'y', to: ray.B.y }
            ];

            // Trigger the animation function
            let animationName = `Token.${this.id}.animateMovement`;
            await CanvasAnimation.animateLinear(attributes, { name: animationName, context: this, duration: duration });
            this._movement = null;
        }
        /**
        * Handles the onchange event of the Scene select field and populates the Notes select field with the TP
        * of the selected scene.
        * @param {*} event
        * @param {*} html
        */
        _onChange(event, html) {
            const selecttxt = `<select name="noteId" data-dtype="String"><option value=""></option></select>`;
            let select = $(selecttxt);
            const notelist = html.find("select[name='noteId']");
            const result = TeleportSheetConfig.getTeleportPoints(html.find("select[name='sceneId']")[0].value);
            $.each(result,function(t){
                if (this.flags.teleport.idText) select.append($("<option />").val(this._id).text(this.flags.teleport.idText));
                else select.append($("<option />").val(this._id).text(this.text));
            });
            notelist.replaceWith(select);
        }

        /**
        * Creates and renders a dialog for name entry
        * @param {*} data
        **/
        _createDialogST(data) {
            const dialogData = data;
            new Dialog({
                title: this.captureDialog.title,
                content: this.captureDialog.content,
                buttons: {
                    save: {
                        label: "Continue",
                        icon: `<i class="fas fa-check"></i>`,
                        callback: async e => {
                            const input = e.find("input[name='name']");
                            if(input[0].value) {
                                let entry = game.journal.entities.find(t => t.name === "Teleportation");
                                if (!entry) entry = await JournalEntry.create({name: "Teleportation"});

                                // Create Note data
                                const data = {
                                    entryId: entry.data._id,
                                    x: dialogData.x,
                                    y: dialogData.y,
                                    icon: CONFIG.Teleport.defaultIcon,
                                    iconSize: 40,
                                    text: `${input[0].value}`,
                                    textAnchor: CONST.TEXT_ANCHOR_POINTS.BOTTOM,
                                    fontSize: 48,
                                    flags: {
                                        teleport: {
                                            sceneTo:"",
                                            noteTo:"",
                                            idText:"",
                                            offsets:[]
                                        }
                                    }
                                };

                                // Validate the final position is in-bounds
                                if ( !canvas.grid.hitArea.contains(data.x, data.y) ) return;

                                // Create a NoteConfig sheet instance to finalize the creation
								canvas.notes.activate()
                                const note = canvas.activeLayer.preview.addChild(new Note(data));
								await note.draw();
                                const sheet = new TeleportSheetConfig(note);
                                sheet.render(true);
                            }
                        }
                    },
                    cancel: {
                        label: "Cancel",
                        icon: `<i class="fas fa-times"></i>`,
                        callback: e => {}
                    }
                },
                default: "save"
            }).render(true);
            teleportpoint.generateCanvasHoverInEvent();
        }

        /** Fires a Hover In Canvas event
         *
         */
        generateCanvasHoverInEvent() {
            event = document.createEvent("HTMLEvents");
            event.initEvent("mouseover", true, true);
			event.data = {};
            canvas.mouseInteractionManager._handleMouseOver(event);
        }
        /** Hook that will pan the view of the PC on its token
         * @param data
        **/
        _callHook(data){
            if (!data) return;
            Hooks.call("teleportation",data.scene,data.note,data.result,data.userId);
        }
    }

const teleportpoint = new(TeleportPoint);