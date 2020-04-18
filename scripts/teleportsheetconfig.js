    //
    /**
    * Placeable Teleport configuration sheet
    * @type {FormApplication}
    * @param teleportpoint {TeleportPoint}          The Teleport Point object for which settings are being configured
    * @param options {Object}     Additional Application options
    */
    class TeleportSheetConfig extends FormApplication {

        constructor(object, options) {
            super(object, options);
            this.numrows = 0;
        }

        static get defaultOptions() {
            return mergeObject(super.defaultOptions, {
                title: "Teleportation Point Configuration",
                id: "tp-config",
                template: "modules/teleport/templates/tp-config.html",
                width: 500,
                height: "auto",
                tabs: [
                    {navSelector: ".tabs", contentSelector: ".content", initial: "tdData"}
                ]
            })
        }

        /* -------------------------------------------- */

        /**
        * Construct and return the data object used to render the HTML template for this form application.
        * @return {Object}
        */
        getData() {
            const entry = game.journal.get(this.object.data.entryId) || {};
            const sceneId = this.object.getFlag("teleport","sceneTo") || "";
            if (!this.object.getFlag("teleport","offsets")) this.object.data.flags.teleport.offsets = [];
            this.numrows = this.object.getFlag("teleport","offsets").length;
            if (!this.object.getFlag("teleport","idText")) this.object.data.flags.teleport.idText = this.object.data.text + "_" + Date.now().toString();
            return {
                entryId: entry._id,
                sceneId: sceneId,
                entries: game.scenes.entities,
                noteId: this.object.getFlag("teleport","noteTo") || "",
                noteentries: TeleportSheetConfig.getTeleportPoints(sceneId),
                object: duplicate(this.object.data),
                options: this.options,
                entryName: entry.name,
                entryIcons: CONFIG.Teleport.noteIcons,
                norows: this.numrows === 0,
                textAnchors: Object.entries(CONST.TEXT_ANCHOR_POINTS).reduce((obj, e) => {
                    obj[e[1]] = e[0].titleCase();
                    return obj;
                }, {})
            }
        }
        /* -------------------------------------------- */

        /**
        * Register game settings used by the SceneTransitionLayer
        */
        static registerSettings() {
            game.settings.register("teleport", "hidedepartingtokens", {
                name: "Hide Departing Tokens",
                hint: "Hide tokens on the original scene when you teleport them to a new one.",
                scope: "world",
                type: Boolean,
                config: true,
                default: false
            });
        }

        /**
        * This method is called upon form submission after form data is validated
        * @param event {Event}       The initial triggering submission event
        * @param formData {Object}   The object of validated form data with which to update the object
        * @private
        */
        _updateObject(event, formData) {
            const offsets = [];
            if ("coordX" in formData) {
                if (this.numrows===1){
                    offsets.push({x:formData["coordX"],y:formData["coordY"]})
                }
                else{
                    for (const [i, v] of formData["coordX"].entries())  offsets.push({x:formData["coordX"][i],y:formData["coordY"][i]});
                }
            }

            formData["flags"] = {
                teleport: {
                    sceneTo : formData["sceneId"],
                    noteTo: formData["noteId"],
                    idText: formData["idText"],
                    offsets: offsets
                }
            };

            delete formData["sceneId"];
            delete formData["noteId"];
            delete formData["idText"];
            if ("coordX" in formData) delete formData["coordX"];
            if ("coordY" in formData) delete formData["coordY"];

            if ( this.object.id ) {
                formData["id"] = this.object.id;
                this.object.update(formData);
            }
            else {
                this.object.constructor.create(formData);
            }
        }

        /* -------------------------------------------- */

        activateListeners(html) {
            super.activateListeners(html);

            //scene list onchange event
            //html.find("select[name='sceneId']")[0].onchange = teleportpoint._onChange.bind(null,event,html);
            const notelist = html.find("select[name='sceneId']")[0];
            notelist.onchange = teleportpoint._onChange.bind(null,event,html);

            html.find('.capture').on('click', ev => {
                const rowHTML = `
                <tr class="teleportrow">
                    <td>
                        <input class="disabled" name="index" value="1" size="5" style="text-align:center;" readonly>
                    </td>
                    <td>
                        <input class="disabled" type="number" name="coordX" value="" placeholder="0.00" readonly/>
                    </td>
                    <td>
                        <input class="disabled" type="number" name="coordY" value="" placeholder="0.00" readonly/>
                    </td>
                    <td>
                        <a class='remove' title="Delete">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<i class="fas fa-times"></i></a>
                    </td>
                </tr>
                `;
                const teleportrow = $(rowHTML);
                const captureBtn = $(ev.currentTarget);
                const body = captureBtn.parent().parent().find('tbody');
                const offsets = this._getOffsets();
                for (const [i, v] of offsets.entries()) {
                    const clone = teleportrow.clone();
                    clone.find('input[name=index]').val(this.numrows);
                    clone.find('input[name=coordX]').val(v.x);
                    clone.find('input[name=coordY]').val(v.y);
                    body.append(clone);
                    this.numrows = this.numrows + 1;
                }
            });

            html.on('click', '.clearall', ev => {
                const captureBtn = $(ev.currentTarget);
                const tab = captureBtn.parent().parent();
                const teleportrows = tab.find('.teleportrow');
                for (const t of teleportrows) {
                    t.remove();
                }
                this.numrows = 0;
            });

            html.on('click', '.remove', ev => {
                const bodydiv = $(ev.currentTarget).parent().parent().parent();
                const row = $(ev.currentTarget).parent().parent();
                if (this.numrows > 1){
                    row.remove();
                    this.numrows = this.numrows - 1;
                }
            });
        }

        _getOffsets(){
            const tokens = canvas.tokens.controlled.filter(t => t.owner === true);
            const offsets = [];
            if (tokens.length > 0){
                for (const t of tokens){
                    const coord = {x:t.x,y:t.y};
                    offsets.push(coord);
                }
            }
            else {
                ui.notifications.warn("There aren't controlled tokens.");
            }
            return offsets;
        }

        /**
        * Extend the logic applied when the application is closed to clear any preview notes
        * @return {Promise}
        */
        async close() {
            if ( !this.object.id ) canvas.notes.preview.removeChildren();
            return super.close();
        }

        /**
        * Helpers methods
        **/
        static getTeleportPoints(sceneId) {
            const scene = game.scenes.get(sceneId);
            if (!scene) return;
            return scene.data.notes.filter(t=>t.flags.teleport !== undefined);
        }

        static getTeleportPoint(sceneId,noteId){
            const scene = game.scenes.get(sceneId);
            if (!scene) return;
            return scene.data.notes.find(t=>t._id === noteId);
        }

        static getTokensQuadrants(o,x,y,g,s) {
            const coords = canvas.grid.getCenter(x,y);
            x = coords[0];
            y = coords[1];
            const a = [];
            let m = 1;
            let i = 0;
            let cont = 0;
            for (const j of o) {
                a.push(canvas.grid.getSnappedPosition(j.x,j.y));
                i = i + 1;
                if (i >= s) break;
            }
            let c = TeleportSheetConfig.getQuadrants(x,y,g,m);
            for (i; i<s;i++) {
                a.push(canvas.grid.getSnappedPosition(c[cont].x,c[cont].y));
                if (cont === 7) {
                    cont = 0;
                    m = m + 1;
                    c = TeleportSheetConfig.getQuadrants(x,y,g,m);
                }
                else
                {
                  cont = cont + 1;
                }
            }
            return a;
        }

        static getQuadrants(x,y,g,m) {
            const x1 = x- (g + g*m);
            const x2 = x - g*m;
            const x3 = x;
            const y1 = y - (g +g*m);
            const y2 = y - g*m;
            const y3 = y;

            return {
                0:{x:x1,y:y1},
                1:{x:x2,y:y1},
                2:{x:x3,y:y1},
                3:{x:x1,y:y2},
                4:{x:x2,y:y2},
                5:{x:x3,y:y2},
                6:{x:x1,y:y3},
                7:{x:x2,y:y3},
                8:{x:x3,y:y3}
            }
        }

        static getTokenQuadrant(o,x,y) {
            if (o.length > 0) return [canvas.grid.getSnappedPosition(o[0].x,o[0].y)];
                return [{x:x,y:y}];
        }

        static getTokenstoMove(fromtokens,totokens){
            let movetokens = [];
            let createtokens = [];

            for (const ft of fromtokens){
                let flag = true;
                for (const tt of totokens) {
                    if (ft.name === tt.name && ft.actor.id === tt.actorId) {
                        movetokens.push(tt);
                        flag = false;
                        break;
                    }
                }
                if (flag) createtokens.push(ft.data);
            }
            return [movetokens,createtokens];
        }

        static getHitArea(coord,width,height){
            return {top:coord.y,bottom:coord.y+height,left:coord.x,right:coord.x+width}
        }

        static hitTest(coord,hitarea){
            return coord.x > hitarea.left &&
                coord.x < hitarea.right &&
                coord.y > hitarea.top &&
                coord.y < hitarea.bottom
            }

        static checkCollision(coord,sceneId){
            const tps = TeleportSheetConfig.getTeleportPoints(sceneId);
            for (const t of tps) {
                const tp = canvas.notes.get(t._id);
                const tpHitArea = TeleportSheetConfig.getHitArea({x: tp.x - tp.width/2,y: tp.y - tp.height/2},tp.width,tp.height);
                const hit = TeleportSheetConfig.hitTest(coord,tpHitArea);
                if (hit) return tp.id;
            }
            return;
        }
    }