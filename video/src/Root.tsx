import { Composition } from "remotion";
import { CardShort, CardShortProps, FPS, HEIGHT, WIDTH } from "./CardShort";

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
  );
}
