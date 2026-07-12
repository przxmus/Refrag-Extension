# Refrag Routine Shuffler

Chrome/Brave extension for `https://play.refrag.gg/routines/*/edit`.

It adds **Shuffle** between **Delete** and **Review & Publish** for routines the current user can edit. It shuffles only map assignments across segments, so every map remains present exactly as often as before, every mod remains assigned exactly as often as before, and no duration is changed. Each updated segment is saved through Refrag’s existing editor; publishing remains a separate, explicit Refrag action.

## Install locally in Brave

1. Open `brave://extensions` and enable **Developer mode**.
2. Choose **Load unpacked**.
3. Select this folder: `/Users/przxmus/Documents/Refrag Extension`.
4. Reload an open Refrag routine edit page.

The extension has no network permissions and does not access Refrag APIs.
