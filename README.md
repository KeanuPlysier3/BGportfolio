# Keanu Plysier — The Camp

A 3D portfolio: create your own adventurer (race, class, colours) and explore a
fantasy island camp inspired by Baldur's Gate 3. Each location on the island
holds a part of the portfolio. Built with Three.js and Vite. There are no model or
audio files: all the geometry and the tavern music are generated in the browser.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in dist/ (relative paths, host anywhere)
npm run preview  # serve the production build
```

`dist/` works on GitHub Pages, Netlify, Vercel or any static host. `base: './'`
in `vite.config.js` means it also works from a sub-folder, for example `keanupl.be/camp/`.

## Controls

| Input | Action |
| --- | --- |
| WASD / arrows (ZQSD on AZERTY) | Walk |
| Shift | Run |
| Space | Jump |
| E | Interact |
| Drag / scroll | Rotate / zoom the camera |
| J | Journal and fast travel |
| C | Edit your character |
| M | Sound on/off |
| H | Controls |

On touch devices, drag on the left half of the screen to walk and tap the prompt to interact.

## Where things live

| What | File |
| --- | --- |
| All portfolio text (profile, projects, skills, contact) | `src/data/portfolio.js` |
| Island locations: names, prompts, panel layout | `src/data/locations.js` |
| Location positions, island shape, paths | `src/world/layout.js` |
| Props (tents, war table, pavilion, armory, …) | `src/world/props.js` |
| World assembly, forest scatter, lighting | `src/world/World.js` |
| Races, classes, colours | `src/character/options.js` |
| Procedural character model and animation | `src/character/Character.js` |
| Music, ambience and sound effects | `src/audio/AudioEngine.js` |

### Locations → portfolio

| Location | Content |
| --- | --- |
| The Campfire | About me, ability scores (from the CV skill dots), traits, languages |
| Quest Board | Internship request (15.02.2027 – 21.05.2027) and contact details |
| The War Table | Plan A (City of Antwerp) |
| The Tailor's Pavilion | MoMu — Dirk |
| The Arcane Circle | Machine-learning web experiments |
| The Armory | Technologies |
| The Scholar's Nook | Education |
| The Merchant's Wagon | Experience |
| Waypoint | Fast travel |
| The Old Dock | Colophon |

## Customising

- **Figma / Behance links:** the CV only names the platforms, so set the `href` values in `CONTACT` in `src/data/portfolio.js`.
- **Your own music:** put a file at `public/audio/theme.mp3`. It replaces the synthesised tune and loops automatically.
- **New location:** add a spot to `SPOTS` in `layout.js`, build a prop for it in `World.js`, then add an entry to `LOCATIONS`. The path, clearing, label, prompt and journal entry are created for it.

## Performance

Most static props are merged into a single mesh with vertex colours, so there are only a few draw calls.
If the frame rate drops below about 40 fps, the renderer lowers its pixel ratio automatically.
