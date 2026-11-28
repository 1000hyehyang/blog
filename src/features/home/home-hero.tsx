const WORD_STAGGER_MS = 80;
const DESCRIPTION_DELAY_MS = 350;

type HomeHeroProps = {
  title: string;
  description: string;
};

export function HomeHero({ title, description }: HomeHeroProps) {
  const words = title.split(" ");
  const descriptionDelay =
    DESCRIPTION_DELAY_MS + (words.length - 1) * WORD_STAGGER_MS;

  return (
    <section>
      <h1 className="page-title">
        {words.map((word, index) => (
          <span key={`${word}-${index}`} className="inline-block">
            <span
              data-hero-word
              className="inline-block"
              style={{ animationDelay: `${index * WORD_STAGGER_MS}ms` }}
            >
              {word}
            </span>
            {index < words.length - 1 ? "\u00A0" : null}
          </span>
        ))}
      </h1>
      <p
        data-hero-desc
        className="mt-3 text-sm text-secondary"
        style={{ animationDelay: `${descriptionDelay}ms` }}
      >
        {description}
      </p>
    </section>
  );
}
