/** Splashz S-mark (vectorised from Sky's white logo, 26 Nov 2026). White mark on a --primary tile. */
const MARK = "M405 826 C336 823 262 800 202 766 C183 754 154 734 140 723 C116 702 97 681 76 656 C60 635 35 597 35 592 C35 591 44 600 55 611 C80 636 98 650 127 667 C167 690 216 705 272 711 C288 713 339 713 356 711 C389 707 412 701 438 693 C492 675 537 647 571 613 C592 591 605 570 614 544 C622 523 624 506 622 488 C618 454 604 426 573 396 C553 376 535 362 488 331 C460 311 449 303 440 293 C423 275 419 257 428 238 C435 222 459 208 489 201 C508 196 522 195 545 195 C610 195 669 213 722 249 C748 267 774 291 791 314 C799 325 800 327 806 336 C833 381 845 425 845 477 C845 516 837 554 822 593 C790 673 727 739 642 780 C572 814 491 830 405 826 Z M280 616 C223 610 173 592 128 562 C68 523 26 465 11 400 C2 362 2 315 9 276 C25 192 77 112 150 60 C162 52 187 36 195 32 C197 31 202 29 206 27 C212 25 212 25 210 27 C209 28 203 33 197 38 C157 68 131 99 113 134 C96 169 89 206 92 240 C99 308 139 369 206 412 C241 435 267 447 333 469 C373 483 386 488 401 498 C420 511 432 527 434 544 C439 578 405 605 347 615 C336 617 292 617 280 616 Z M472 419 C459 416 440 413 431 411 C374 400 345 394 320 387 C232 362 179 321 160 266 C155 250 152 228 154 212 C159 163 187 116 235 78 C276 45 333 21 393 10 C418 5 425 4 464 4 C502 4 508 5 534 9 C637 26 731 84 786 165 C797 182 807 200 807 201 C807 202 801 197 793 190 C772 170 758 159 733 144 C686 118 635 103 579 100 C533 98 477 106 434 121 C421 126 392 140 381 147 C339 173 319 202 319 237 C319 270 340 302 388 340 C402 351 441 379 479 404 C489 410 499 418 501 420 L506 424L502 424 C499 424 486 422 472 419 Z";

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <span aria-hidden="true" style={{ width: size, height: size, background: "var(--primary, #1F3FD6)", display: "inline-grid", placeItems: "center", flex: "none" }}>
      <svg width={size * 0.72} height={size * 0.72} viewBox="0 0 848 830">
        <path fill="#fff" fillRule="evenodd" d={MARK} />
      </svg>
    </span>
  );
}

export function Wordmark() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <Logo />
      <span style={{ display: "flex", alignItems: "baseline", gap: 7, whiteSpace: "nowrap" }}>
        <b style={{ fontFamily: "var(--display)", fontSize: 22, fontWeight: 700, letterSpacing: -0.5 }}>splashz</b>
        <span className="xs muted">by Move Labs</span>
      </span>
    </span>
  );
}
