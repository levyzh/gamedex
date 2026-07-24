// time.ts — turning timestamps into human phrases ("2 hours ago").
// Its own file because it's general-purpose: comments use it today, and
// anything else that shows "when" can import it later.

// How a moment in the past reads to a human right now.
//
// The shape is a plain ladder: find the largest unit that fits, say the
// count in that unit. Past ~a month we stop counting and just show the
// date — "47 days ago" is harder to place than "May 16".
export function timeAgo(isoDate: string): string {
  const then = new Date(isoDate).getTime();
  const secondsAgo = Math.floor((Date.now() - then) / 1000);

  // Clock skew can make a just-posted comment appear to be from the
  // (very near) future — treat anything under a minute as "just now".
  if (secondsAgo < 60) {
    return "just now";
  }

  const minutes = Math.floor(secondsAgo / 60);
  if (minutes < 60) {
    return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 31) {
    return days === 1 ? "yesterday" : `${days} days ago`;
  }

  // Older than a month: a date is clearer than a count. Only mention the
  // year when it isn't this year — "May 16" vs "May 16, 2024".
  const date = new Date(isoDate);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });
}
