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
 *                          noteTo: "gretewffvty31"
 *                        }
 *          }
 * });
 */
class TeleportPoint {

      get DIALOG() {
            return {
                content: `<div class="form-group"><p class="notes">Enter a name:</p></label><input name="name" type="text"></div></br>`,
                title: "Teleportation Point Name"
            }
        }

      getSceneControlButtons(buttons) {
        let noteButton = buttons.find(b => b.name === "notes");

        if (noteButton) {
            noteButton.tools.push({
                name: "teleportation",
                title: "Toggle Add Teleportation Point",
                icon: "fab fa-firstdraft",
                toggle: true,
                active: false,
                visible: game.user.isGM,
                onClick: (value) => {
                    this.registerListeners(value);
                }
            });
        }
      }

      registerListeners(value) {
          if (value) {
              if (game.modules.get("pin-cushion") && game.modules.get("pin-cushion").active) canvas.stage.off("click");
              canvas.stage.on("click", event => this._onClickCanvas(event));
          }
          else {
              canvas.stage.off("click");
              if (game.modules.get("pin-cushion") && game.modules.get("pin-cushion").active) {
                  const pc = new PinCushion();
                  canvas.stage.on("click", event => pc._onClickCanvas(event));
              }
          }
      }

    /* -------------------------------- Listeners ------------------------------- */

    /**
     * Handles canvas clicks
     */
    _onClickCanvas(event) {
        const now = Date.now();
        if (canvas.activeLayer.name !== "NotesLayer" || canvas.activeLayer._hover) {
            return;
        }

        // If the click is less than 250ms since the last clicktime, it must be a doubleclick
        if (now - event.data.clickTime < 250) {
            this._onDoubleClick(event);
        }
        // Set clickTime to enable doubleclick detection
        event.data.clickTime = now;
    }

    /**
     * Handles doubleclicks
     * @param {*} event
     */
    _onDoubleClick(event) {
        const data = {
            x: event.data.destination.x,
            y: event.data.destination.y
        };

        //if (ui.controls.controls.find(t=>t.name == "notes").tools.find(t=>t.name == "teleportation").active) {
        this._createDialogST(data);
    }

      async _onDoubleLeft(event) {
        //Need this to clean the previos hovered note.
        canvas.activeLayer._hover = null;
        //Read flags from note
        const sceneTo = this.getFlag("teleport", "sceneTo");
        const noteTo =  this.getFlag("teleport", "noteTo");
        if (sceneTo) { //If is a transition note then send player to transition point.
            // to scene data
            let scene = game.scenes.get(sceneTo);
            let note  = TeleportSheetConfig.getTeleportPoint(sceneTo,noteTo);
            if (game.user.isGM && scene._id !== canvas.scene._id) {
                let preloaded = await game.scenes.preload(sceneTo);
                if (!preloaded) return ui.notifications.warn("Destination scene is not loaded yet. Please try again.");
            }
            if (!scene) return;
            //from scene data
            const foct = canvas.tokens.controlled.filter(t => t.owner === true); //owened controlled tokens
            canvas.tokens.releaseAll();
            //processing scene
            //... Activate the scene
            if (game.user.isGM && foct.length > 0) scene.activate();
            //... Calculate the focus point in the new scene
            let arrival;
            if (noteTo && noteTo !== "") {
                arrival = { x:note.x , y:note.y, scale:1, duration: 10 };
            }
            else {
                const dimensions = canvas.getDimensions(scene.data);
                arrival = { x:dimensions.width / 2, y:dimensions.height / 2, scale:1, duration: 10  };
            }
            //... Show the scene if wasn't visible or redraw is if the same scene
            if (scene._id !== canvas.scene._id) {
                if (game.user.isGM && foct.length > 0) await scene.update({navigation: true});
                await scene.view();
            }
            await canvas.animatePan(arrival);
            //process tokens in To scene, this scene is now the viewed scene in the canvas
            //... Modified arrival to snap to grid
            arrival = canvas.grid.getCenter(arrival.x,arrival.y);
            const toct = canvas.tokens.ownedTokens;
            let ptokens = TeleportSheetConfig.getTokenstoMove(foct,toct);
            let quadrants = TeleportSheetConfig.getTokensQuadrant(arrival[0],arrival[1],scene.data.grid,
                                                                    ptokens[0].length + ptokens[1].length);
            let cont = 0;
            //...Move existing tokens in the scene
            $.each(ptokens[0], async function(i,t) {
                let data = {_id: t.id,
                            x: canvas.grid.getSnappedPosition(quadrants[cont].x,quadrants[cont].y).x,
                            y: canvas.grid.getSnappedPosition(quadrants[cont].x,quadrants[cont].y).y
                            };
                cont = cont + 1;
                canvas.tokens.get(data._id)._noAnimate = true;
                await canvas.scene.updateEmbeddedEntity("Token",data,{embeddedName:"Token",teleported:true});
                canvas.tokens.get(data._id)._noAnimate = false;
            });
            //...Create missing tokens in the scene
            $.each(ptokens[1], async function(i,t) {
                let data = t.clone().data;
                let coors = canvas.grid.getSnappedPosition(quadrants[cont].x,quadrants[cont].y);
                data.x = coors.x;
                data.y = coors.y;
                delete data["_id"];
                cont = cont + 1;
                await canvas.scene.createEmbeddedEntity("Token",data,{embeddedName:"Token",teleported:true});
            });
        }
        else {//If is a regular note, open journalentry sheet.
            const entry = this.entry;
            if ( entry ) entry.sheet.render(true);
        }
      }

      /* -------------------------------------------- */

      /** @override */
      _onDoubleRight(event) {
        let sheet;
        const sceneTo = this.getFlag("teleport", "sceneTo");
        if (sceneTo && sceneTo !== "") {
            sheet = new TeleportSheetConfig(this);
        }
        else {
            sheet = this.sheet;
        }
        if ( sheet ) sheet.render(true);
      }

      _onChange(event, html) {
          const selecttxt = `<select name="noteId" data-dtype="String"><option value=""></option></select>`;
          let select = $(selecttxt);
          const notelist = html.find("select[name='noteId']");
          const result = TeleportSheetConfig.getTeleportPoints(html.find("select[name='sceneId']")[0].value);
          $.each(result,function(t){
              select.append($("<option />").val(this._id).text(this.text));
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
            title: this.DIALOG.title,
            content: this.DIALOG.content,
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
                                        noteTo:""
                                    }
                                }
                            };

                            // Validate the final position is in-bounds
                            if ( !canvas.grid.hitArea.contains(data.x, data.y) ) {
                                return;
                            }

                            // Create a NoteConfig sheet instance to finalize the creation
                            const note = canvas.activeLayer.preview.addChild(new Note(data).draw());
                            const sheet = new TeleportSheetConfig(note);
                            sheet.render(true);
                        }
                    }
                },
                cancel: {
                    label: "Cancel",
                    icon: `<i class="fas fa-times"></i>`,
                    callback: e => {
                        // Maybe do something in the future
                    }
                }
            },
            default: "save"
        }).render(true);
    }
}

const teleportpoint = new(TeleportPoint);