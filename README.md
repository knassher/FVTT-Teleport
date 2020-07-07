# FVTT-Teleport
A module for FVTT to teleport tokens between two points

### Instalation
Manifest: https://raw.githubusercontent.com/knassher/FVTT-Teleport/master/module.json

### Features
* TP config sheet has a new tap called Offsets in which the user can save offsets (as many as you want) for the token when they teleported to that TP. To use this feature just controlle a token or tokens an move it/them to the desire possition, then hit the capture button.
* The middle button of a mouse (wheel button) can be use to start a drag and drop workflow to teleport tokens, just controll a set of tokens, press the middle button and drag those tokens to a TP, once you drop the tokens over the TP those tokens will be teleported to the destination TP.
* A new setting flag was added to the foundry's config to hide tokens from the departed scene when they are teleported to a different scene.
* Added a button to the TP config sheet to highlight the offsets of the TP on the canvas as a visual help.

### How to Use it
## Adding a new Teleport Point (TP)
1. Go to the desire scene.
2. On the control bar select "Journal Notes" button. 
3. On the journal control bar, select the "Add Teleport Point" button.
4. Go to the desire location on the scene and hit double click with the left button of your mouse.
5. A message box will appear requesting the name for the teleport point, fill it out and the click continue.
6. The configuration form for the TP will appear. From here you can select the destination for the TP and the offset for the arrival.
7. Once everything is filled out click on "Update Note" to save the TP. A new note map will be added to the scene as well a new journal entry will be added under the "Teleport      Points" folder

## Modifying a Teleport Point (TP)
1. Do a double right click over the desire TP.
2. The configuration form for the TP will appear.
3. Do all the desire modifications, once you are done click the "Update Note" button.

## Deleting a Teleport Point (TP)
1. On the control bar select "Journal Notes" button.
2. Select the note that you want to delete. (orange border will appear over the note icon)
3. Hit the delete key on the keyboard. The icon will be removed from the scene as well as the journal entry associated with the TP.

## Triggering a Teleport Point (TP)
There are 3 ways to trigger a TP, those are:
1. Using the arrows keys from the keyboard. When you move a token with the keyboard over a TP, the TP will be triggered and all controlled tokens will be teleported to the          destination point.
2. With a double left click. When you double left click over a TP, the TP will be triggered and all controlled tokens will be teleported to the destination point.
3. With a drag & drop using the middle button of a mouse. When you drag a token with the middle button and then drop it over a TP, the TP will be triggered and all controlled      tokens will be teleported to the destination point.

### Consideration
* These are the permission needed for a PC to successfully interact with a TP:
  - Journal Entry associated with TP --> GM needs to grant "Observer" permission to the PC
  - Teleport tokens between scenes --> GM needs to grant the "Create New Tokens" permission to the Player role.
* To see note on a scene you need:
  - Have access to the journal entries associeted with the notes you want your PCs to see.
  - Toogle the "Notes Display" button on the Journal control bar.
  
### Changelog
## V 2.1.5
* Fixed an issue where all PC are pulled to a scene when someone on the party triggers a TP.
* Added a new setting option (only for GM's) to activate a scene once the GM has teleported some token. By default this setting is set to true.
* Now when a TP is deleted from a scene the correspoding journal entry will be deleted.

## V 2.1.4
* Disabled autoscrolling for middle button of the mouse.

## V 2.1.3
* Fixed an issue with the panning when a token was teleported too quickly on a same scene.

## V 2.1.2
* Added compatibility with Foundry VTT version 0.6.4

## V 2.1.1
* Added some minor improvements and cleaning of the code.

## V 2.1.0
* Fixed some compatibility issues with other modules
* Now TPs are bound to its own journal entry, these new entries are arranged in folders, the root folder is called "Teleportation Points" and then for each scene that has TPs a new folder is created. To give access to a TP you have to granted access as observer to its corresponding journal entry.
* Now you can display the journal entry of a TP by holding the shift key and double left click.

## V 2.0.9
* Tokens will remain controlled (selected) after they are teleported.

## V 2.0.8
* Now the animation movement for the token is disable when is teleported.
* Now when a token collisions with a TP when is moved using the arrows keys the TP is triggered.

## V 2.0.7
* Added compatibility for FVTT 0.6.2
* Fixed some compatibility issues with Pin Cushion module.
* Now the Add TP Button will keep toggled when the user switch between scenes.
* Now when the TP config sheet closes the canvas regains the control again.
* Some housekeeping of the code.

## V 2.0.6
* Added compatibility for FVTT 0.6.1
* Log messages and UI messages generated by the module will use NavName instead of the scene name.

## V 2.0.5
* Fixed an issue with the TPConfig sheet that didn't render due to changes on FVTT core.
* Fixed an issue that won't trigger TPoints that don't have a scene and/or destination set. 
* A warning message was set up letting know the user that needs to set a scene and/or a destination note.
* Fixed an issue with the toggle button for adding a TPoint, now only one dialog to collect the name of the TPoint will be render after a doble left click.
* Fixed an issue capturing the position for the TPoint.
* Now the TPConfig sheet will be rendered only if the "teleport" key is in the note's flag dictionary.
* Now the TPoint will trigger only if the "teleport" key is in the note's flag dictionary.
* Made some cleaning to the code.

### Dependencies
Modules:
None at the moment

### Known Issues
* The TP config sheet doesn't resize automatically when the content surpass the limits of the form.
  
### Special Thanks
The code is based on the pin-cushion module from Evan Clark [errational#2007] (https://github.com/death-save/pin-cushion).
