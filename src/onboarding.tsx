import { createSignal, onCleanup, onMount, type Component } from "solid-js";

const ADJECTIVES = [
  "bright",
  "calm",
  "clever",
  "cozy",
  "gentle",
  "keen",
  "lively",
  "quick",
  "sunny",
  "vivid",
] as const;

const NOUNS = [
  "conversation",
  "gathering",
  "huddle",
  "meeting",
  "moment",
  "session",
  "standup",
  "sync",
  "talk",
  "workshop",
] as const;

function pick<T>(items: readonly T[]): T {
  return items[Math.floor(Math.random() * items.length)]!;
}

function generateMeetingName(): string {
  return `${pick(ADJECTIVES)}-${pick(NOUNS)}`;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const Onboarding: Component = () => {
  const [name, setName] = createSignal(generateMeetingName());

  onMount(() => {
    document.body.classList.add("onboarding");
  });

  onCleanup(() => {
    document.body.classList.remove("onboarding");
  });

  const startMeeting = () => {
    const meeting = slugify(name());
    if (!meeting) return;

    const url = new URL(window.location.href);
    url.pathname = `/${meeting}`;
    url.searchParams.delete("room");
    window.location.href = url.toString();
  };

  const regenerate = () => {
    setName(generateMeetingName());
  };

  const handleSubmit = (event: SubmitEvent) => {
    event.preventDefault();
    startMeeting();
  };

  return (
    <main class="onboarding__container">
      <section class="onboarding__card">
        <header class="onboarding__header">
          <h1>Start a meeting</h1>
          <p>Pick a name or use the suggested one below.</p>
        </header>

        <form class="onboarding__form" onSubmit={handleSubmit}>
          <label class="onboarding__label" for="meeting-name">
            Meeting name
          </label>
          <input
            id="meeting-name"
            class="onboarding__input"
            type="text"
            autocomplete="off"
            value={name()}
            onInput={(event) => setName(event.currentTarget.value)}
            required
          />

          <div class="onboarding__actions">
            <button type="button" class="onboarding__secondary" onClick={regenerate}>
              Generate another
            </button>
            <button type="submit" class="onboarding__primary">
              Start meeting
            </button>
          </div>
        </form>
      </section>
    </main>
  );
};

export { generateMeetingName };
