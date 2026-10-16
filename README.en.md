# Porntrex Resume

[Português (Brasil)](README.md) · **English**

Pick up browsing each profile's videos where you left off.

Porntrex usually changes pages in a video list without updating the address. This userscript saves the position for each profile, adds pagination to the URL, and restores your saved position when you return. It runs in the background without adding a panel or text to the page.

## Install

1. Install or enable a userscript manager that supports the modern `GM` API in your browser.
2. Click **[Install the script](https://raw.githubusercontent.com/adestrador/porntrex-resume/main/porntrex-resume.user.js)**.
3. Confirm installation in your manager and reload a profile's video list.

If your browser only displays the source code, open your manager's menu, create a new script, replace its entire contents with `porntrex-resume.user.js`, and save.

You do not need developer tools, manual URL edits, or desktop utilities. Node.js is only needed to run the development tests.

## How to use

Browse the video list as usual. The script recognizes pagination buttons and saves the position before loading the next page. When it cannot recognize a button, it also tries to track the site's internal pagination request.

When you return to a profile, the most recently saved position takes priority over the URL of a restored tab. Each profile has its own record.

Open the script's submenu in your userscript manager to access these commands. The menu labels below match the current script:

| Menu label | What it does |
| --- | --- |
| Consultar posição salva | Shows the saved position and storage status. |
| Ir para uma posição… | Lets you choose another pagination position. |
| Voltar ao início | Saves the starting position and opens the first page. |

To check your installation, browse a few pages, check the saved position in the menu, and reopen the profile. The address will include `from_uploaded_videos`.

## Compatibility

**Works with any userscript manager that provides modern storage and menu command APIs.**

Your manager must provide `GM.getValue`, `GM.setValue`, and `GM.registerMenuCommand`. These are the interfaces used by the script; it does not depend on a particular extension brand.

It runs on video lists at `/members/ID/videos/` on `porntrex.com` and `www.porntrex.com`.

## Data and privacy

The code contains no telemetry, backend server, or external dependencies. The position, filters, and update timestamp are kept in the manager's storage and in a local backup on the site itself. The script does not send these records to GitHub or another service.

The local backup helps recover a change if the extension's write is interrupted. Force-closing the browser during a write can still lose the latest changes; wait for storage confirmation in the menu when checking session recovery.

## Limitations

- Saves the list page, not the last video watched. New uploads and changes in sorting may change which videos appear on each page.
- Records are not synchronized between browsers or computers.
- To open a different position from the one already saved, use **Ir para uma posição…**. The saved position takes priority over URL parameters entered manually.
- Changes to the site's structure may require a script update.

## Update

The script header points to the file in this repository for your manager's update checks. You can also click **Install the script** again and confirm the update.

If you already use an earlier version named **Porntrex — continuar por perfil**, update the existing script instead of keeping two active copies. The name, namespace, and storage keys have been preserved in this distribution. Switching managers may not preserve the extension's stored data.

## Report a problem

Open an [issue](https://github.com/adestrador/porntrex-resume/issues) with your browser, userscript manager, script version, and steps to reproduce the problem. Mention whether the pagination position changes in the URL and include the message from **Consultar posição salva**. Do not include cookies or account data.

## Development

No dependency installation is required. With Node.js 20 or later:

```sh
npm run check
npm test
```

The tests use a simulated environment to check per-profile storage, recovery from an outdated URL, the local backup, pagination clicks, and menu commands. They do not replace checks on the live site.

Contributions are welcome. Describe the problem, your proposed change, and how you checked the result.

## License

[MIT](LICENSE).
