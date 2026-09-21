# video/ — films from code (Remotion)

Card shorts and captions rendered from React. The site's public/ folder is
the asset root, so a card is `catalog/aff_boss.jpg` and its Hindi twin
`catalog/hi/aff_boss.jpg`. Scene images and voices are made elsewhere and
only assembled here.

    cd video
    npm run studio                      # live preview in the browser
    npx remotion render src/index.ts CardShort out/partner-en.mp4 --props=props/partner-en.json
    npx remotion render src/index.ts CardShort out/partner-hi.mp4 --props=props/partner-hi.json

Props: `cards` (paths under public/), `kicker`, `cta`, optional `audio`
(a path under public/), `secondsPerCard`. Output is 1080×1920 at 30 fps for
Shorts, Reels and WhatsApp status. Upload with the usual yt-upload flow.
