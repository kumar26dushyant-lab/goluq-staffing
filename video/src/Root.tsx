import { Composition } from "remotion";
import { CardShort, CardShortProps, FPS, HEIGHT, WIDTH } from "./CardShort";
import { RentStory, RentStoryProps, RENT_DURATION } from "./RentStory";
import rentEn from "../props/rent-en.json";
import { OgImage } from "./OgImage";

/**
 * Compositions are rendered by id:
 *   npx remotion render src/index.ts CardShort out/partner-en.mp4 --props=props/partner-en.json
 * The duration follows the props: cards × secondsPerCard.
 */
const partnerEn: CardShortProps = {
  cards: ["catalog/aff_boss.jpg", "catalog/aff_earn.jpg", "catalog/aff_steps.jpg"],
  kicker: "Partner programme",
  cta: "Ask on WhatsApp · goluq.com/partner",
  secondsPerCard: 5,
};

export function RemotionRoot() {
  return (
    <>
    <Composition id="OgImage" component={OgImage} width={1200} height={630} fps={1} durationInFrames={1} />
    <Composition
      id="RentStory"
      component={RentStory}
      width={WIDTH}
      height={HEIGHT}
      fps={FPS}
      durationInFrames={RENT_DURATION}
      defaultProps={rentEn as RentStoryProps}
    />
    <Composition
      id="CardShort"
      component={CardShort}
      width={WIDTH}
      height={HEIGHT}
      fps={FPS}
      durationInFrames={Math.round(partnerEn.cards.length * partnerEn.secondsPerCard * FPS)}
      defaultProps={partnerEn}
      calculateMetadata={({ props }) => ({ durationInFrames: Math.round(props.cards.length * props.secondsPerCard * FPS) })}
    />
    </>
  );
}
