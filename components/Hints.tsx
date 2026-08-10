/**
 * The two keybind affordances, as inverted chips.
 *
 * Each sits with the thing it controls: the scramble hint under the scramble,
 * the timer hint under the digits. They're permanent rather than one-shot tips
 * — the space chip now covers the pointer binding too, which is not
 * discoverable at all without being told.
 *
 * Both hide in focus mode. Once you're actually solving, you know.
 */

function Chip({ keyName, children }: { keyName: string; children: React.ReactNode }) {
  return (
    <span className="hint-chip">
      <kbd className="font-mono">{keyName}</kbd>
      <span className="hint-text">{children}</span>
    </span>
  );
}

function Wrapper({ hidden, children }: { hidden: boolean; children: React.ReactNode }) {
  return (
    <div
      aria-hidden={hidden}
      className="flex justify-center transition-opacity duration-500"
      style={{ opacity: hidden ? 0 : 1 }}
    >
      {children}
    </div>
  );
}

/** Sits under the scramble. */
export function ScrambleHint({ hidden }: { hidden: boolean }) {
  return (
    <Wrapper hidden={hidden}>
      <Chip keyName="tab">for a new scramble</Chip>
    </Wrapper>
  );
}

/** Sits under the timer. */
export function TimerHint({ hidden }: { hidden: boolean }) {
  return (
    <Wrapper hidden={hidden}>
      <Chip keyName="space">or click &amp; hold to start</Chip>
    </Wrapper>
  );
}
