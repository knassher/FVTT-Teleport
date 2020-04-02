/**
 * Placeable Teleport configuration sheet
 * @type {FormApplication}
 * @param teleportpoint {TeleportPoint}          The Teleport Point object for which settings are being configured
 * @param options {Object}     Additional Application options
 */
class TeleportSheetConfig extends FormApplication {
	static get defaultOptions() {
	  const options = super.defaultOptions;
	  options.id = "st-config";
      options.title = "Teleportation Point Configuration";
	  options.template = "modules/teleport/templates/st-config.html";
	  options.width = 400;
	  return options;
  }

  /* -------------------------------------------- */

  /**
   * Construct and return the data object used to render the HTML template for this form application.
   * @return {Object}
   */
  getData() {
    const entry = game.journal.get(this.object.data.entryId) || {};
    const sceneId = this.object.getFlag("teleport","sceneTo") || ""
    return {
      entryId: entry._id,
      sceneId: sceneId,
      entries: game.scenes.entities,
      noteId: this.object.getFlag("teleport","noteTo") || "",
      noteentries: TeleportSheetConfig.getSceneTransitions(sceneId),
      object: duplicate(this.object.data),
      options: this.options,
      entryName: entry.name,
      entryIcons: CONFIG.Teleport.noteIcons,
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
      //game.settings.register("teleport", "transition", {
      //  name: "Map Scene Transition Toggle",
      // scope: "world",
      //  type: Boolean,
      //  config: false,
      //  default: false
      //});
    }
  /**
   * This method is called upon form submission after form data is validated
   * @param event {Event}       The initial triggering submission event
   * @param formData {Object}   The object of validated form data with which to update the object
   * @private
   */
  _updateObject(event, formData) {
    formData["flags"] = {
        teleport: {
          sceneTo : formData["sceneId"],
          noteTo: formData["noteId"]
        }
      };
    delete formData["sceneId"];
    delete formData["noteId"];
    if ( this.object.id ) {
      formData["id"] = this.object.id;
      this.object.update(formData);
    }
    else {
      this.object.constructor.create(formData);
    }
  }

  /* -------------------------------------------- */

  /**
   * Extend the logic applied when the application is closed to clear any preview notes
   * @return {Promise}
   */
  async close() {
    if ( !this.object.id ) canvas.notes.preview.removeChildren();
    return super.close();
  }

  static getSceneTransitions(sceneId) {
    const scene = game.scenes.get(sceneId);
    if (!scene) return;
    return scene.data.notes.filter(t=>t.flags.teleport != undefined);
  }
  static getSceneTransition(sceneId,noteId){
    const scene = game.scenes.get(sceneId);
    if (!scene) return;
    return scene.data.notes.find(t=>t._id == noteId);
  }

  static getTokensCuadrant(x,y,g,s) {
    let m = 1;
    let a = [];
    let i = 0;
    let cont = 0;
    let c = TeleportSheetConfig.getCuadrant(x,y,g,m);
    for (i; i<s;i++) {
      a.push(c[cont]);
      if (cont == 7) {
        cont = 0;
        m = m + 1;
        c = TeleportSheetConfig.getCuadrant(x,y,g,m);
      }
      else
      {
        cont = cont + 1;
      }
    }
    return a;
  }

  static getCuadrant(x,y,g,m) {
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
      6:{x:x1,y:y1},
      7:{x:x2,y:y2},
      8:{x:x3,y:y3}
    }
  }

  static getTokenstoMove(fromtokens,totokens){
      let movetokens = [];
      let createtokens = [];

      for (const ft of fromtokens){
        let flag = true;
        for (const tt of totokens) {
          if (ft.name == tt.name && ft.actor.id == tt.actor.id) {
            movetokens.push(tt);
            flag = false;
            break;
          }
        }
        if (flag) createtokens.push(ft);
      }

      return [movetokens,createtokens];
  }
}