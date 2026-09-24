import type { Product } from "@/domain/demo";
export function ProductArt({ kind }: { kind: Product["kind"] }) {
  return (
    <div className={`product-art ${kind}`} aria-hidden="true">
      <svg viewBox="0 0 360 210" fill="none">
        <defs>
          <linearGradient id={`metal-${kind}`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#596566" />
            <stop offset=".48" stopColor="#262f31" />
            <stop offset="1" stopColor="#0d1315" />
          </linearGradient>
          <linearGradient id={`glass-${kind}`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#768ca4" />
            <stop offset=".5" stopColor="#273a52" />
            <stop offset="1" stopColor="#b8c6d4" />
          </linearGradient>
        </defs>
        <ellipse
          cx="180"
          cy="184"
          rx={kind === "gpu" ? 135 : 83}
          ry="9"
          fill="#172f28"
          opacity=".1"
        />
        {kind === "gpu" && (
          <g transform="translate(35 51) rotate(-7 140 55)">
            <path
              d="M0 16 22 0H278L292 16V102L271 120H17L0 102Z"
              fill={`url(#metal-${kind})`}
            />
            <path
              d="M11 22 31 9H267L280 24V97L262 111H24L11 99Z"
              stroke="#6b7779"
              strokeWidth="2"
            />
            {[82, 208].map((x) => (
              <g key={x}>
                <circle
                  cx={x}
                  cy="59"
                  r="46"
                  fill="#101617"
                  stroke="#677375"
                  strokeWidth="4"
                />
                {Array.from({ length: 9 }, (_, i) => (
                  <path
                    key={i}
                    d={`M${x} 56 Q${x - 35} 13 ${x + 11} 18 Q${x + 20} 35 ${x + 4} 58Z`}
                    transform={`rotate(${i * 40} ${x} 59)`}
                    fill="#374144"
                    stroke="#4f5a5d"
                  />
                ))}
                <circle cx={x} cy="59" r="13" fill="#202829" stroke="#718080" />
                <path d={`m${x - 6} 61 6-8 6 8-6-3Z`} fill="#a6d9b1" />
              </g>
            ))}
            <path d="M27 120H168V127H27Z" fill="#bf9c56" />
            <path d="M292 17H300V111H291" stroke="#808a8b" strokeWidth="4" />
            <path d="M119 110H175" stroke="#94d356" strokeWidth="3" />
          </g>
        )}
        {kind === "ssd" && (
          <g transform="translate(44 76) rotate(-12 140 30)">
            <rect width="278" height="65" rx="5" fill="#123c55" />
            <rect x="21" y="8" width="237" height="49" rx="2" fill="#e8e9e4" />
            <path d="M28 8h49v49H28z" fill="#d42d39" />
            <text x="88" y="29" fill="#1d252b" fontSize="20" fontWeight="700">
              KINGSTON
            </text>
            <text x="88" y="48" fill="#4a5357" fontSize="13">
              NV2 · PCIe 4.0 · 1 TB
            </text>
            <path d="M278 11h13v43h-13" fill="#c4a454" />
            <circle cx="5" cy="33" r="4" fill="#f1f5f3" />
          </g>
        )}
        {kind === "fone" && (
          <g transform="translate(91 10)">
            <path
              d="M19 110V80C19-6 157-6 157 80V110"
              stroke="#171f22"
              strokeWidth="20"
            />
            <path
              d="M23 80C23 2 151 2 151 80"
              stroke="#576263"
              strokeWidth="8"
            />
            <rect
              x="5"
              y="86"
              width="44"
              height="88"
              rx="21"
              fill={`url(#metal-${kind})`}
              transform="rotate(-12 28 120)"
            />
            <rect
              x="128"
              y="86"
              width="44"
              height="88"
              rx="21"
              fill={`url(#metal-${kind})`}
              transform="rotate(12 148 120)"
            />
            <path d="M41 92v62M136 92v62" stroke="#6b7372" strokeWidth="3" />
            <text
              x="132"
              y="120"
              fill="#a5afaa"
              fontSize="9"
              transform="rotate(90 140 123)"
            >
              SONY
            </text>
          </g>
        )}
        {kind === "phone" && (
          <g transform="translate(123 9) rotate(8 55 90)">
            <rect
              width="107"
              height="179"
              rx="19"
              fill="#1e252c"
              stroke="#737e83"
              strokeWidth="3"
            />
            <rect
              x="5"
              y="5"
              width="97"
              height="169"
              rx="15"
              fill={`url(#glass-${kind})`}
            />
            <ellipse
              cx="53"
              cy="143"
              rx="44"
              ry="56"
              fill="#899aa8"
              opacity=".65"
            />
            <rect x="31" y="10" width="45" height="13" rx="7" fill="#131c21" />
          </g>
        )}
      </svg>
      <span className="illustration-label">Ilustração</span>
    </div>
  );
}
