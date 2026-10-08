import GuideArticle from "../components/GuideArticle";
import { fixtures } from "../data/selectors";
export default function DcCultureGuide() {
  return (
    <GuideArticle
      guide={fixtures.guides.find((g) => g.slug === "dc-culture-guide")!}
    />
  );
}
