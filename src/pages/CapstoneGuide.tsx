import GuideArticle from "../components/GuideArticle";
import { fixtures } from "../data/selectors";
export default function CapstoneGuide() {
  return (
    <GuideArticle
      guide={fixtures.guides.find((g) => g.slug === "capstone-guide")!}
    />
  );
}
