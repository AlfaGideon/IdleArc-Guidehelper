# Item icons

[Русская версия](README.md)

Guide Helper includes 202 game icons in this folder. The Item Codex lists the artwork for each item tier and awakening rank under Appearance. The [icon index](index.json) maps each item family to its image files.

## Download the icons

The bundled icons work offline. If icons are missing, choose one of these methods.

| Method | How to use it |
| --- | --- |
| Browser | In Guide Helper, open **Gear** and find **Item images**. Select **Download game images through browser**. Your browser downloads the files and sends them to the local server. Use this when only your browser can reach the image source. |
| Command line | From the project folder, run `node scripts/fetch-art.mjs` on a computer with internet access. The script writes the icons and `index.json` to this folder. |
| Server | Under **Gear** > **Item images**, select **Download game images**. The local server downloads the files. If the server cannot reach the source, Guide Helper tries the browser. |

If an image is missing or fails to load, the item card displays a built-in SVG illustration.
