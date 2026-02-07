"use client";

import { useState, useMemo, Suspense, lazy } from "react";
import dynamic from "next/dynamic";
import VolleyBall from "@/components/logo/VolleyBall";
import VolleyWordmark from "@/components/logo/VolleyWordmark";

// Dynamic imports for heavy shader components (no SSR)
const MetallicPaint = dynamic(() => import("@/components/logo/MetallicPaint"), {
  ssr: false,
});
const LiquidMetal = dynamic(
  () =>
    import("@paper-design/shaders-react").then((m) => ({
      default: m.LiquidMetal,
    })),
  { ssr: false }
);
const Heatmap = dynamic(
  () =>
    import("@paper-design/shaders-react").then((m) => ({
      default: m.Heatmap,
    })),
  { ssr: false }
);

// ─── Types ──────────────────────────────────────────────────────────────────
type LogoVariant = "ball" | "wordmark";
type BackgroundMode = "light" | "dark" | "custom" | "checkerboard";
type FillMode = "solid" | "gradient" | "theme-fg";
type GradientDirection = "to-right" | "to-bottom" | "to-br" | "radial";
type EffectType =
  | "none"
  | "emboss"
  | "noise"
  | "chrome"
  | "holographic"
  | "scanlines"
  | "liquid-metal"
  | "heatmap"
  | "metallic-paint";

// ─── SVG raw markup for data URL generation ─────────────────────────────────
const BALL_SVG = `<svg width="76" height="76" viewBox="0 0 76 76" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M37.0729 43.0379L38.0651 41.7751C50.7872 42.0769 62.6193 48.2375 70.073 58.3884C63.3284 68.9768 51.4845 76 38.0001 76C33.1274 76 28.469 75.0827 24.1879 73.4118C33.8703 71.2507 43.1708 67.046 51.274 61.3677C52.5633 60.4644 52.8757 58.6871 51.9724 57.3982C51.0692 56.1092 49.2919 55.7965 48.0029 56.6997C38.5162 63.3478 27.3324 67.768 16.0172 68.9996C12.6754 66.6257 9.73402 63.7248 7.31421 60.418C19.0088 58.5933 29.6852 52.4372 37.0729 43.0379Z" fill="FILL"/>
<path d="M33.2376 38.6933L32.5912 39.5156C25.609 48.3993 15.2666 53.9955 4.04991 55.0884C1.45913 49.9512 0 44.1459 0 37.9998C0 27.6317 4.1522 18.2336 10.8845 11.3773L10.8796 11.3988C8.8092 20.6499 8.69406 30.1812 10.5379 39.4685C10.8443 41.0124 12.3444 42.0156 13.8883 41.709C15.4322 41.4027 16.4353 39.9024 16.1288 38.3585C13.952 27.3939 14.7536 16.0537 18.5415 5.35291C22.5389 2.96513 27.0117 1.29077 31.7841 0.505493L31.1028 2.12369C26.0912 14.0258 26.9115 27.5103 33.2376 38.6933Z" fill="FILL"/>
<path d="M38.3086 36.0796C32.7481 26.3891 32.004 14.6713 36.3558 4.33567L38.1813 0C55.6014 0.0813964 70.2516 11.8841 74.6508 27.9267C66.3531 20.961 56.4632 16.1845 45.9064 13.9727C44.3659 13.6499 42.8553 14.6372 42.5327 16.1777C42.2097 17.7183 43.197 19.2288 44.7375 19.5516C55.9567 21.9021 66.3433 27.4215 74.5718 35.5609L74.5794 35.5685L75.9869 36.9844C75.9957 37.3219 76.0002 37.6604 76.0002 37.9998C76.0002 43.2731 74.926 48.2955 72.9849 52.8601C64.4641 42.5921 51.8226 36.4311 38.3086 36.0796Z" fill="FILL"/>
</svg>`;

const WORDMARK_SVG = `<svg width="210" height="94" viewBox="0 0 210 94" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M1.11279 36.5919C16.4301 34.2453 32.0849 39.18 43.4165 49.9865L43.1812 51.9484C41.4309 66.5543 45.3642 81.2001 53.9517 92.963C48.9691 93.7347 43.8857 93.6997 38.9126 92.8575C30.1391 81.9408 24.2545 68.3639 21.7847 54.3253C21.449 52.4181 19.6304 51.1441 17.7231 51.4796C15.8157 51.8152 14.5405 53.6334 14.8765 55.5411C16.9862 67.5322 21.4202 79.2833 27.9644 89.588C22.7857 87.3169 17.9345 84.0611 13.6948 79.8214C1.96245 68.0889 -2.23154 51.673 1.11279 36.5919ZM86.0161 45.8175C80.5108 53.8305 73.5586 60.6942 65.4751 66.0997C63.8653 67.1764 63.4328 69.3553 64.5093 70.965C65.5857 72.575 67.7645 73.0073 69.3745 71.9308C74.4524 68.5351 79.1188 64.611 83.311 60.2277C83.5353 61.0101 83.8378 61.7656 84.2251 62.4874L84.5522 63.0714C85.3394 64.4115 86.2856 65.5991 87.4009 66.6066C87.7705 66.9404 88.1734 67.2856 88.6069 67.6417C88.5222 67.8115 88.4341 67.9796 88.3472 68.1486H86.5317C85.6023 68.1488 84.8118 68.5016 84.2202 68.9982L83.979 69.2198C83.221 69.9779 82.9566 70.9221 82.9565 71.7247V73.1163C82.9565 74.0987 83.0566 75.0554 83.2612 75.9786C82.1963 77.3056 81.0516 78.5906 79.8208 79.8214C74.4732 85.169 68.1522 88.9505 61.4282 91.1661C52.62 80.4559 48.4906 66.5877 50.145 52.7833L50.2983 51.505C63.7209 47.7816 74.9794 38.7849 81.5679 26.632L86.0161 45.8175ZM95.0767 47.5333C97.8926 47.5334 100.148 48.3813 101.844 50.0773C103.572 51.7733 104.436 53.9972 104.436 56.7491V57.9005C104.436 58.0605 104.373 58.2051 104.245 58.3331C104.149 58.429 104.021 58.4766 103.861 58.4767H98.3403C98.1805 58.4767 98.0366 58.429 97.9087 58.3331C97.8127 58.2051 97.7642 58.0605 97.7642 57.9005V56.6046C97.7641 55.6128 97.5085 54.829 96.9966 54.2531C96.5166 53.6451 95.8766 53.341 95.0767 53.3409C94.3087 53.3409 93.6846 53.6292 93.2046 54.2052C92.7247 54.7492 92.4849 55.517 92.4849 56.5089C92.4849 57.4689 92.789 58.3169 93.397 59.0529C94.005 59.7888 95.2047 60.8132 96.9966 62.1251C98.9804 63.597 100.468 64.7968 101.46 65.7247C102.484 66.6207 103.269 67.6291 103.813 68.7491C104.389 69.837 104.676 71.149 104.676 72.6847C104.676 75.5007 103.812 77.7414 102.084 79.4054C100.357 81.0692 98.0839 81.9005 95.2681 81.9005C93.4123 81.9005 91.7804 81.5329 90.3726 80.797C88.9646 80.061 87.8769 79.0367 87.1089 77.7247C86.3409 76.3808 85.9566 74.8452 85.9565 73.1173V71.7247C85.9566 71.5649 86.0043 71.4369 86.1001 71.3409C86.2279 71.2131 86.372 71.1488 86.5317 71.1486H92.0522C92.2121 71.1486 92.3401 71.2131 92.436 71.3409C92.564 71.4369 92.6284 71.5648 92.6284 71.7247V72.7814C92.6285 73.7732 92.885 74.5729 93.397 75.1808C93.909 75.7887 94.5489 76.0929 95.3169 76.0929C96.0847 76.0928 96.7249 75.8045 97.2368 75.2286C97.7486 74.6527 98.0044 73.9006 98.0044 72.9728C98.0044 72.0129 97.6844 71.1965 97.0444 70.5245C96.4044 69.8205 95.1561 68.7971 93.3003 67.4532C91.7003 66.3013 90.4046 65.277 89.4126 64.381C88.4206 63.485 87.5717 62.3805 86.8677 61.0685C86.1957 59.7565 85.813 58.2209 85.813 56.5089C85.813 53.7889 86.6609 51.6126 88.3569 49.9806C89.654 48.7326 91.2693 47.9626 93.2026 47.6691C94.007 47.5654 94.5314 47.5333 95.0767 47.5333ZM136.176 47.9171C136.336 47.9171 136.464 47.9809 136.56 48.1085C136.688 48.2045 136.752 48.3333 136.752 48.4933V72.6368C136.752 73.6607 137.008 74.493 137.52 75.1329C138.032 75.7729 138.705 76.0929 139.537 76.0929C140.369 76.0929 141.024 75.7729 141.504 75.1329C142.016 74.4929 142.273 73.6608 142.273 72.6368V48.4933C142.273 48.3333 142.321 48.2045 142.417 48.1085C142.544 47.9808 142.688 47.9172 142.848 47.9171H148.464C148.624 47.9171 148.752 47.9808 148.848 48.1085C148.976 48.2045 149.041 48.3333 149.041 48.4933V71.965C149.041 74.9729 148.161 77.389 146.401 79.213C144.673 81.005 142.385 81.9005 139.537 81.9005C136.657 81.9005 134.337 81.005 132.577 79.213C130.849 77.389 129.985 74.973 129.985 71.965V48.4933C129.985 48.3333 130.032 48.2045 130.128 48.1085C130.256 47.9808 130.4 47.9172 130.56 47.9171H136.176ZM195.922 47.5333C198.866 47.5333 201.219 48.3971 202.979 50.1251C204.771 51.8531 205.667 54.1574 205.667 57.0372V72.3966C205.667 75.2764 204.771 77.5808 202.979 79.3087C201.219 81.0367 198.866 81.9005 195.922 81.9005C192.978 81.9005 190.627 81.0367 188.867 79.3087C187.107 77.5807 186.227 75.2766 186.227 72.3966V57.0372C186.227 54.1573 187.107 51.8531 188.867 50.1251C190.627 48.3972 192.978 47.5334 195.922 47.5333ZM126.299 47.9171C126.459 47.9171 126.587 47.9808 126.683 48.1085C126.811 48.2045 126.875 48.3333 126.875 48.4933V53.1486C126.875 53.3086 126.811 53.4532 126.683 53.5812C126.587 53.677 126.459 53.7247 126.299 53.7247H120.299C120.139 53.7247 120.059 53.805 120.059 53.965V80.9406C120.059 81.1005 119.996 81.2452 119.868 81.3732C119.772 81.4692 119.643 81.5167 119.483 81.5167H113.868C113.708 81.5167 113.563 81.4692 113.435 81.3732C113.339 81.2452 113.292 81.1005 113.292 80.9406V53.965C113.291 53.805 113.211 53.7247 113.051 53.7247H107.292C107.132 53.7247 106.987 53.6772 106.859 53.5812C106.763 53.4532 106.715 53.3085 106.715 53.1486V48.4933C106.715 48.3333 106.763 48.2045 106.859 48.1085C106.987 47.9805 107.132 47.9171 107.292 47.9171H126.299ZM162.08 47.9171C164.992 47.9171 167.328 48.7651 169.088 50.4611C170.848 52.157 171.728 54.4129 171.728 57.2286V72.2052C171.728 75.0209 170.848 77.2769 169.088 78.9728C167.328 80.6688 164.992 81.5167 162.08 81.5167H153.392C153.232 81.5167 153.088 81.469 152.96 81.3732C152.864 81.2452 152.816 81.1006 152.816 80.9406V48.4933C152.816 48.3333 152.864 48.2045 152.96 48.1085C153.088 47.9808 153.232 47.9171 153.392 47.9171H162.08ZM181.836 47.9171C181.996 47.9172 182.124 47.9808 182.22 48.1085C182.348 48.2045 182.412 48.3333 182.412 48.4933V80.9406C182.412 81.1006 182.348 81.2452 182.22 81.3732C182.124 81.4691 181.996 81.5167 181.836 81.5167H176.22C176.06 81.5167 175.916 81.469 175.789 81.3732C175.693 81.2452 175.644 81.1006 175.644 80.9406V48.4933C175.644 48.3333 175.693 48.2045 175.789 48.1085C175.916 47.9808 176.06 47.9171 176.22 47.9171H181.836ZM195.922 53.3409C195.026 53.341 194.306 53.661 193.762 54.3009C193.25 54.9089 192.995 55.7252 192.995 56.7491V72.6847C192.995 73.7085 193.25 74.5408 193.762 75.1808C194.306 75.7887 195.026 76.0928 195.922 76.0929C196.818 76.0929 197.539 75.7888 198.083 75.1808C198.626 74.5408 198.899 73.7087 198.899 72.6847V56.7491C198.899 55.7251 198.627 54.9089 198.083 54.3009C197.539 53.661 196.818 53.3409 195.922 53.3409ZM159.824 53.7247C159.664 53.7248 159.584 53.8051 159.583 53.965V75.4689C159.583 75.6288 159.664 75.709 159.824 75.7091L161.984 75.6613C162.848 75.6293 163.552 75.2608 164.096 74.5568C164.64 73.8528 164.928 72.9244 164.96 71.7726V57.6613C164.96 56.4454 164.688 55.4853 164.144 54.7814C163.6 54.0774 162.864 53.7247 161.936 53.7247H159.824ZM114.485 10.5333C117.429 10.5333 119.782 11.3971 121.542 13.1251C123.333 14.8531 124.229 17.1574 124.229 20.0372V35.3966C124.229 38.2764 123.333 40.5807 121.542 42.3087C119.782 44.0367 117.429 44.9005 114.485 44.9005C111.541 44.9005 109.189 44.0367 107.429 42.3087C105.669 40.5807 104.79 38.2766 104.79 35.3966V20.0372C104.79 17.1573 105.669 14.8531 107.429 13.1251C109.189 11.3972 111.541 10.5334 114.485 10.5333ZM23.6333 6.10461C41.4194 -4.02594 64.4359 -1.54781 79.6636 13.5382L77.479 18.8986C72.2726 31.6777 61.4303 41.226 48.1606 44.8195C36.0966 33.3671 19.7368 27.7281 3.38916 29.2482C5.67183 23.588 9.10682 18.2835 13.6948 13.6954C13.9901 13.4002 14.2891 13.1094 14.5903 12.8234L17.0464 12.8165H17.0601C31.3014 12.8941 45.1411 17.1284 56.9478 24.8448C58.5688 25.9042 60.7418 25.4494 61.8013 23.8282C62.861 22.2071 62.4059 20.0333 60.7847 18.9738C49.6749 11.7129 36.9137 7.26361 23.6333 6.10461ZM88.2925 10.9171C88.6765 10.9171 88.8845 11.0934 88.9165 11.4454L92.228 32.5646C92.26 32.6926 92.3086 32.757 92.3726 32.757C92.4365 32.7569 92.4841 32.6925 92.5161 32.5646L95.7329 11.4454C95.7649 11.0934 95.9729 10.9171 96.3569 10.9171H102.357C102.773 10.9173 102.932 11.1253 102.836 11.5411L95.9243 43.9894C95.8602 44.3411 95.6522 44.5167 95.3003 44.5167H89.1089C88.757 44.5167 88.549 44.3411 88.4849 43.9894L81.6206 11.5411L81.5728 11.3488C81.5729 11.061 81.7485 10.9172 82.1001 10.9171H88.2925ZM134.149 10.9171C134.309 10.9172 134.437 10.9808 134.533 11.1085C134.661 11.2045 134.724 11.3333 134.724 11.4933V38.4689C134.724 38.6288 134.805 38.709 134.964 38.7091H145.044C145.204 38.7091 145.332 38.7728 145.428 38.9005C145.556 38.9965 145.621 39.1253 145.621 39.2853V43.9406C145.621 44.1006 145.556 44.2452 145.428 44.3732C145.332 44.469 145.204 44.5167 145.044 44.5167H128.533C128.373 44.5167 128.229 44.469 128.101 44.3732C128.005 44.2452 127.957 44.1006 127.957 43.9406V11.4933C127.957 11.3333 128.005 11.2045 128.101 11.1085C128.229 10.9808 128.373 10.9171 128.533 10.9171H134.149ZM154.586 10.9171C154.746 10.9172 154.874 10.9808 154.97 11.1085C155.098 11.2045 155.162 11.3333 155.162 11.4933V38.4689C155.162 38.6288 155.242 38.709 155.402 38.7091H165.482C165.642 38.7091 165.77 38.7728 165.866 38.9005C165.994 38.9965 166.058 39.1253 166.058 39.2853V43.9406C166.058 44.1006 165.994 44.2452 165.866 44.3732C165.77 44.469 165.642 44.5167 165.482 44.5167H148.97C148.81 44.5167 148.666 44.469 148.539 44.3732C148.443 44.2452 148.394 44.1006 148.394 43.9406V11.4933C148.394 11.3333 148.443 11.2045 148.539 11.1085C148.666 10.9808 148.81 10.9171 148.97 10.9171H154.586ZM185.872 10.9171C186.031 10.9171 186.159 10.9808 186.255 11.1085C186.383 11.2045 186.448 11.3333 186.448 11.4933V16.1486C186.448 16.3086 186.383 16.4532 186.255 16.5812C186.159 16.677 186.031 16.7247 185.872 16.7247H175.839C175.68 16.7248 175.599 16.8051 175.599 16.965V24.549C175.599 24.7089 175.68 24.7891 175.839 24.7892H181.599C181.759 24.7892 181.888 24.8527 181.984 24.9806C182.112 25.0766 182.175 25.2054 182.175 25.3654V30.0206C182.175 30.1806 182.112 30.3253 181.984 30.4532C181.888 30.5492 181.759 30.5968 181.599 30.5968H175.839C175.68 30.5969 175.599 30.6771 175.599 30.837V38.4689C175.599 38.6288 175.68 38.709 175.839 38.7091H185.872C186.031 38.7091 186.159 38.7728 186.255 38.9005C186.383 38.9965 186.448 39.1253 186.448 39.2853V43.9406C186.448 44.1006 186.383 44.2452 186.255 44.3732C186.159 44.469 186.031 44.5167 185.872 44.5167H169.408C169.248 44.5167 169.104 44.469 168.976 44.3732C168.88 44.2452 168.832 44.1006 168.832 43.9406V11.4933C168.832 11.3333 168.88 11.2045 168.976 11.1085C169.104 10.9808 169.248 10.9171 169.408 10.9171H185.872ZM195.35 10.9171C195.702 10.9171 195.926 11.0769 196.022 11.3966L198.999 22.8693C199.03 22.9649 199.078 23.0126 199.142 23.0128C199.206 23.0128 199.255 22.9651 199.287 22.8693L202.262 11.3966C202.358 11.0769 202.582 10.9172 202.934 10.9171H208.838C209.03 10.9171 209.174 10.9809 209.27 11.1085C209.366 11.2045 209.383 11.365 209.319 11.589L202.55 31.1251L202.502 31.4132V43.8927C202.502 44.0527 202.438 44.1973 202.31 44.3253C202.214 44.4211 202.086 44.4689 201.926 44.4689H196.31C196.15 44.4688 196.006 44.4212 195.878 44.3253C195.782 44.1973 195.735 44.0527 195.735 43.8927V31.4132L195.686 31.1251L188.966 11.589C188.934 11.525 188.918 11.4447 188.918 11.3488C188.919 11.061 189.095 10.9172 189.447 10.9171H195.35ZM114.485 16.3409C113.589 16.341 112.869 16.661 112.325 17.3009C111.813 17.9089 111.557 18.7252 111.557 19.7491V35.6847C111.557 36.7085 111.813 37.5408 112.325 38.1808C112.869 38.7887 113.589 39.0928 114.485 39.0929C115.381 39.0929 116.101 38.7888 116.645 38.1808C117.189 37.5408 117.461 36.7087 117.461 35.6847V19.7491C117.461 18.7251 117.189 17.9089 116.645 17.3009C116.101 16.661 115.381 16.3409 114.485 16.3409Z" fill="FILL"/>
</svg>`;

function makeSvgDataUrl(svg: string, fill: string) {
  const filled = svg.replace(/fill="FILL"/g, `fill="${fill}"`);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(filled)}`;
}

// ─── Presets ────────────────────────────────────────────────────────────────
const THEME_PRESETS = [
  { name: "Foreground Light", value: "#1a1a1a" },
  { name: "Foreground Dark", value: "#e8e8e8" },
  { name: "Orange Accent", value: "#f97316" },
  { name: "Muted", value: "#808080" },
  { name: "Setter Purple", value: "#8b5cf6" },
  { name: "OH1 Blue", value: "#3b82f6" },
  { name: "MB1 Green", value: "#22c55e" },
  { name: "MB2 Teal", value: "#14b8a6" },
  { name: "Opposite Pink", value: "#ec4899" },
  { name: "Pure White", value: "#ffffff" },
  { name: "Pure Black", value: "#000000" },
];

const GRADIENT_PRESETS = [
  { name: "Sunset", c1: "#f97316", c2: "#ec4899", dir: "to-right" as GradientDirection },
  { name: "Ocean", c1: "#3b82f6", c2: "#14b8a6", dir: "to-br" as GradientDirection },
  { name: "Neon", c1: "#8b5cf6", c2: "#06b6d4", dir: "to-right" as GradientDirection },
  { name: "Fire", c1: "#ef4444", c2: "#f59e0b", dir: "to-bottom" as GradientDirection },
  { name: "Gold", c1: "#fbbf24", c2: "#b45309", dir: "radial" as GradientDirection },
  { name: "Ice", c1: "#e0f2fe", c2: "#3b82f6", dir: "radial" as GradientDirection },
];

const EFFECTS: { value: EffectType; label: string; group: string }[] = [
  { value: "none", label: "None", group: "basic" },
  { value: "emboss", label: "Emboss", group: "svg" },
  { value: "noise", label: "Noise", group: "svg" },
  { value: "chrome", label: "Chrome", group: "svg" },
  { value: "holographic", label: "Holo", group: "svg" },
  { value: "scanlines", label: "Scanlines", group: "svg" },
  { value: "liquid-metal", label: "Liquid Metal", group: "paper" },
  { value: "heatmap", label: "Heatmap", group: "paper" },
  { value: "metallic-paint", label: "Metallic Paint", group: "reactbits" },
];

const isCanvasEffect = (e: EffectType) =>
  ["liquid-metal", "heatmap", "metallic-paint"].includes(e);

// ─── SVG Filter definitions ─────────────────────────────────────────────────
function SVGFilters({ chromeIntensity, chromeSurface, chromeFocus }: { chromeIntensity: number; chromeSurface: number; chromeFocus: number }) {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }}>
      <defs>
        <filter id="emboss">
          <feConvolveMatrix order="3" kernelMatrix="-2 -1 0 -1 1 1 0 1 2" preserveAlpha="true" />
        </filter>
        <filter id="noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" result="noise" />
          <feColorMatrix in="noise" type="saturate" values="0" result="grayNoise" />
          <feBlend in="SourceGraphic" in2="grayNoise" mode="multiply" />
        </filter>
        <filter id="chrome">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1" result="blur" />
          <feSpecularLighting in="blur" surfaceScale={chromeSurface} specularConstant="1" specularExponent={chromeFocus} lightingColor="#ffffff" result="specular">
            <fePointLight x="50" y="-100" z="200" />
          </feSpecularLighting>
          <feComposite in="specular" in2="SourceGraphic" operator="in" result="specular-in" />
          <feComposite in="SourceGraphic" in2="specular-in" operator="arithmetic" k1="0" k2="1" k3={chromeIntensity} k4="0" />
        </filter>
        <filter id="holographic">
          <feOffset in="SourceGraphic" dx="2" dy="0" result="red" />
          <feColorMatrix in="red" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.5 0" result="red-colored" />
          <feOffset in="SourceGraphic" dx="-2" dy="0" result="cyan" />
          <feColorMatrix in="cyan" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.5 0" result="cyan-colored" />
          <feBlend in="red-colored" in2="cyan-colored" mode="screen" result="combined" />
          <feBlend in="SourceGraphic" in2="combined" mode="screen" />
        </filter>
        <filter id="scanlines">
          <feImage href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='2' height='4'%3E%3Crect width='2' height='2' fill='%23000' opacity='0.15'/%3E%3C/svg%3E" x="0" y="0" width="2" height="4" result="scanline" />
          <feTile in="scanline" result="tiled" />
          <feBlend in="SourceGraphic" in2="tiled" mode="multiply" />
        </filter>
      </defs>
    </svg>
  );
}

// ─── Main Playground ────────────────────────────────────────────────────────
export default function LogoPlayground() {
  const [variant, setVariant] = useState<LogoVariant>("ball");
  const [bgMode, setBgMode] = useState<BackgroundMode>("dark");
  const [bgCustom, setBgCustom] = useState("#1a1a1a");
  const [fillMode, setFillMode] = useState<FillMode>("solid");
  const [fillColor, setFillColor] = useState("#f97316");
  const [gradColor1, setGradColor1] = useState("#f97316");
  const [gradColor2, setGradColor2] = useState("#ec4899");
  const [gradDir, setGradDir] = useState<GradientDirection>("to-right");
  const [effect, setEffect] = useState<EffectType>("none");
  const [scale, setScale] = useState(1.5);

  // Paper shader tunables
  const [metalSpeed, setMetalSpeed] = useState(1);
  const [metalDistortion, setMetalDistortion] = useState(0.07);

  // Chrome filter tunables
  const [chromeIntensity, setChromeIntensity] = useState(0.4);
  const [chromeSurface, setChromeSurface] = useState(3);
  const [chromeFocus, setChromeFocus] = useState(25);

  const bgColor =
    bgMode === "light" ? "#f5f5f5" : bgMode === "dark" ? "#1a1a1a" : bgMode === "custom" ? bgCustom : "transparent";

  const bgStyle: React.CSSProperties =
    bgMode === "checkerboard"
      ? {
          backgroundImage: `linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)`,
          backgroundSize: "20px 20px",
          backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
          backgroundColor: "#e5e5e5",
        }
      : { backgroundColor: bgColor };

  const effectiveFill =
    fillMode === "theme-fg"
      ? bgMode === "dark" ? "#e8e8e8" : "#1a1a1a"
      : fillMode === "gradient"
        ? `url(#logo-gradient)`
        : fillColor;

  const solidFillForShaders =
    fillMode === "theme-fg"
      ? bgMode === "dark" ? "#e8e8e8" : "#1a1a1a"
      : fillMode === "gradient"
        ? fillColor
        : fillColor;

  const svgFilterId = ["emboss", "noise", "chrome", "holographic", "scanlines"].includes(effect)
    ? `url(#${effect})`
    : undefined;

  const svgMarkup = variant === "ball" ? BALL_SVG : WORDMARK_SVG;
  const svgDataUrl = useMemo(
    () => makeSvgDataUrl(svgMarkup, "#000000"),
    [svgMarkup]
  );

  const ballSize = Math.round(76 * scale);
  const wordmarkHeight = Math.round(94 * scale);
  const wordmarkWidth = Math.round(wordmarkHeight * (210 / 94));
  const previewW = variant === "ball" ? ballSize : wordmarkWidth;
  const previewH = variant === "ball" ? ballSize : wordmarkHeight;

  const showCanvas = isCanvasEffect(effect);

  return (
    <div className="min-h-screen font-sans" style={{ backgroundColor: "#0d0d0d", color: "#e5e5e5" }}>
      <SVGFilters chromeIntensity={chromeIntensity} chromeSurface={chromeSurface} chromeFocus={chromeFocus} />

      {/* Gradient def */}
      <svg width="0" height="0" style={{ position: "absolute" }}>
        <defs>
          {gradDir === "radial" ? (
            <radialGradient id="logo-gradient">
              <stop offset="0%" stopColor={gradColor1} />
              <stop offset="100%" stopColor={gradColor2} />
            </radialGradient>
          ) : (
            <linearGradient
              id="logo-gradient"
              x1={gradDir === "to-right" || gradDir === "to-br" ? "0%" : "0%"}
              y1="0%"
              x2={gradDir === "to-right" || gradDir === "to-br" ? "100%" : "0%"}
              y2={gradDir === "to-bottom" || gradDir === "to-br" ? "100%" : "0%"}
            >
              <stop offset="0%" stopColor={gradColor1} />
              <stop offset="100%" stopColor={gradColor2} />
            </linearGradient>
          )}
        </defs>
      </svg>

      {/* Header */}
      <div className="sticky top-0 z-50 px-6 py-4 border-b" style={{ backgroundColor: "#0d0d0d", borderColor: "#2a2a2a" }}>
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <h1 className="text-xl font-semibold tracking-tight">Logo Playground</h1>
          <a href="/" className="text-sm opacity-50 hover:opacity-100 transition-opacity">Back to app</a>
        </div>
      </div>

      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-0 lg:gap-8 p-6">
        {/* ─── Preview ─────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          <div className="rounded-xl overflow-hidden border" style={{ borderColor: "#2a2a2a" }}>
            <div className="flex items-center justify-center p-16 min-h-[400px] transition-colors duration-300" style={bgStyle}>
              {showCanvas ? (
                <div style={{ width: Math.max(previewW, 300), height: Math.max(previewH, 300) }}>
                  {effect === "liquid-metal" && (
                    <LiquidMetal
                      style={{ width: "100%", height: "100%" }}
                      image={svgDataUrl}
                      colorBack={bgColor === "transparent" ? "#1a1a1a" : bgColor}
                      colorTint={solidFillForShaders}
                      speed={metalSpeed}
                      distortion={metalDistortion}
                      scale={0.6}
                      fit="contain"
                    />
                  )}
                  {effect === "heatmap" && (
                    <Heatmap
                      style={{ width: "100%", height: "100%" }}
                      image={svgDataUrl}
                      colors={["#f97316", "#ec4899", "#8b5cf6", "#3b82f6", "#14b8a6"]}
                      colorBack={bgColor === "transparent" ? "#1a1a1a" : bgColor}
                      contour={0.5}
                      innerGlow={0.5}
                      outerGlow={0.3}
                      speed={metalSpeed}
                      scale={0.75}
                    />
                  )}
                  {effect === "metallic-paint" && (
                    <MetallicPaint
                      imageSrc={svgDataUrl}
                      speed={metalSpeed * 0.3}
                      tintColor={solidFillForShaders}
                      liquid={0.75}
                      brightness={2}
                      contrast={0.5}
                    />
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center gap-12">
                  {variant === "ball" && (
                    <VolleyBall
                      fillColor={effectiveFill}
                      size={ballSize}
                      style={{ filter: svgFilterId, transition: "filter 0.3s" }}
                    />
                  )}
                  {variant === "wordmark" && (
                    <VolleyWordmark
                      fillColor={effectiveFill}
                      height={wordmarkHeight}
                      style={{ filter: svgFilterId, transition: "filter 0.3s" }}
                    />
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Size thumbnails */}
          {!showCanvas && (
            <div className="mt-6">
              <span className="text-xs font-medium" style={{ color: "#888" }}>Preview at common sizes</span>
              <div className="flex gap-4 items-end mt-3 p-6 rounded-lg border overflow-x-auto" style={{ borderColor: "#2a2a2a", backgroundColor: bgColor }}>
                {[16, 24, 32, 48, 64, 96, 128].map((size) => (
                  <div key={size} className="flex flex-col items-center gap-2 shrink-0">
                    {variant === "ball" ? (
                      <VolleyBall fillColor={effectiveFill} size={size} />
                    ) : (
                      <VolleyWordmark fillColor={effectiveFill} height={size} />
                    )}
                    <span className="text-xs tabular-nums" style={{ color: "#666" }}>{size}px</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ─── Controls ────────────────────────────────────── */}
        <div className="w-full lg:w-80 shrink-0 space-y-6 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto lg:pr-2" style={{ scrollbarWidth: "thin", scrollbarColor: "#333 transparent" }}>
          <Section title="Logo">
            <Seg options={[{ value: "ball", label: "Ball" }, { value: "wordmark", label: "Wordmark" }]} value={variant} onChange={(v) => setVariant(v as LogoVariant)} />
          </Section>

          <Section title="Background">
            <Seg options={[{ value: "light", label: "Light" }, { value: "dark", label: "Dark" }, { value: "checkerboard", label: "Check" }, { value: "custom", label: "Custom" }]} value={bgMode} onChange={(v) => setBgMode(v as BackgroundMode)} />
            {bgMode === "custom" && (
              <div className="flex items-center gap-3 mt-3">
                <Swatch color={bgCustom} />
                <input type="color" value={bgCustom} onChange={(e) => setBgCustom(e.target.value)} className="w-full h-8 cursor-pointer rounded" style={{ backgroundColor: "transparent" }} />
              </div>
            )}
          </Section>

          {!showCanvas && (
            <Section title="Fill">
              <Seg options={[{ value: "solid", label: "Solid" }, { value: "gradient", label: "Gradient" }, { value: "theme-fg", label: "Auto" }]} value={fillMode} onChange={(v) => setFillMode(v as FillMode)} />
              {fillMode === "solid" && (
                <>
                  <div className="flex items-center gap-3 mt-3">
                    <Swatch color={fillColor} />
                    <input type="color" value={fillColor} onChange={(e) => setFillColor(e.target.value)} className="w-full h-8 cursor-pointer rounded" style={{ backgroundColor: "transparent" }} />
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {THEME_PRESETS.map((p) => (
                      <button key={p.value} onClick={() => setFillColor(p.value)} title={p.name}>
                        <div className="w-7 h-7 rounded-md border-2 transition-transform hover:scale-110" style={{ backgroundColor: p.value, borderColor: fillColor === p.value ? "#f97316" : "rgba(255,255,255,0.15)" }} />
                      </button>
                    ))}
                  </div>
                </>
              )}
              {fillMode === "gradient" && (
                <>
                  <div className="flex gap-3 mt-3">
                    <div className="flex-1"><MiniLabel>Start</MiniLabel><input type="color" value={gradColor1} onChange={(e) => setGradColor1(e.target.value)} className="w-full h-8 cursor-pointer rounded" /></div>
                    <div className="flex-1"><MiniLabel>End</MiniLabel><input type="color" value={gradColor2} onChange={(e) => setGradColor2(e.target.value)} className="w-full h-8 cursor-pointer rounded" /></div>
                  </div>
                  <Seg options={[{ value: "to-right", label: "→" }, { value: "to-bottom", label: "↓" }, { value: "to-br", label: "↘" }, { value: "radial", label: "◎" }]} value={gradDir} onChange={(v) => setGradDir(v as GradientDirection)} />
                  <div className="flex flex-wrap gap-2 mt-3">
                    {GRADIENT_PRESETS.map((p) => (
                      <button key={p.name} onClick={() => { setGradColor1(p.c1); setGradColor2(p.c2); setGradDir(p.dir); }} className="text-xs px-3 py-1.5 rounded-md border" style={{ background: `linear-gradient(to right, ${p.c1}, ${p.c2})`, borderColor: "rgba(255,255,255,0.15)", color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.5)" }}>
                        {p.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {fillMode === "theme-fg" && <p className="text-xs mt-2" style={{ color: "#888" }}>Auto-matches the background.</p>}
            </Section>
          )}

          <Section title="Effects">
            <div className="space-y-2">
              <MiniLabel>SVG Filters</MiniLabel>
              <div className="grid grid-cols-3 gap-1.5">
                {EFFECTS.filter((e) => e.group === "basic" || e.group === "svg").map((e) => (
                  <EffectBtn key={e.value} label={e.label} active={effect === e.value} onClick={() => setEffect(e.value)} />
                ))}
              </div>
              <MiniLabel>Paper Shaders</MiniLabel>
              <div className="grid grid-cols-2 gap-1.5">
                {EFFECTS.filter((e) => e.group === "paper").map((e) => (
                  <EffectBtn key={e.value} label={e.label} active={effect === e.value} onClick={() => setEffect(e.value)} />
                ))}
              </div>
              <MiniLabel>ReactBits</MiniLabel>
              <div className="grid grid-cols-2 gap-1.5">
                {EFFECTS.filter((e) => e.group === "reactbits").map((e) => (
                  <EffectBtn key={e.value} label={e.label} active={effect === e.value} onClick={() => setEffect(e.value)} />
                ))}
              </div>
            </div>
          </Section>

          {effect === "chrome" && (
            <Section title="Chrome Controls">
              <MiniLabel>Highlight Intensity</MiniLabel>
              <div className="flex items-center gap-3">
                <input type="range" min="0" max="1" step="0.05" value={chromeIntensity} onChange={(e) => setChromeIntensity(parseFloat(e.target.value))} className="flex-1 accent-orange-500" />
                <span className="text-sm tabular-nums w-10 text-right" style={{ color: "#888" }}>{chromeIntensity.toFixed(2)}</span>
              </div>
              <MiniLabel>Surface Depth</MiniLabel>
              <div className="flex items-center gap-3">
                <input type="range" min="0.5" max="15" step="0.5" value={chromeSurface} onChange={(e) => setChromeSurface(parseFloat(e.target.value))} className="flex-1 accent-orange-500" />
                <span className="text-sm tabular-nums w-10 text-right" style={{ color: "#888" }}>{chromeSurface.toFixed(1)}</span>
              </div>
              <MiniLabel>Highlight Focus</MiniLabel>
              <div className="flex items-center gap-3">
                <input type="range" min="1" max="80" step="1" value={chromeFocus} onChange={(e) => setChromeFocus(parseFloat(e.target.value))} className="flex-1 accent-orange-500" />
                <span className="text-sm tabular-nums w-10 text-right" style={{ color: "#888" }}>{chromeFocus}</span>
              </div>
            </Section>
          )}

          {showCanvas && (
            <Section title="Shader Controls">
              <MiniLabel>Speed</MiniLabel>
              <div className="flex items-center gap-3">
                <input type="range" min="0" max="3" step="0.1" value={metalSpeed} onChange={(e) => setMetalSpeed(parseFloat(e.target.value))} className="flex-1 accent-orange-500" />
                <span className="text-sm tabular-nums w-10 text-right" style={{ color: "#888" }}>{metalSpeed.toFixed(1)}</span>
              </div>
              {effect === "liquid-metal" && (
                <>
                  <MiniLabel>Distortion</MiniLabel>
                  <div className="flex items-center gap-3">
                    <input type="range" min="0" max="0.3" step="0.01" value={metalDistortion} onChange={(e) => setMetalDistortion(parseFloat(e.target.value))} className="flex-1 accent-orange-500" />
                    <span className="text-sm tabular-nums w-10 text-right" style={{ color: "#888" }}>{metalDistortion.toFixed(2)}</span>
                  </div>
                </>
              )}
            </Section>
          )}

          {!showCanvas && (
            <Section title="Scale">
              <div className="flex items-center gap-3">
                <input type="range" min="0.5" max="4" step="0.1" value={scale} onChange={(e) => setScale(parseFloat(e.target.value))} className="flex-1 accent-orange-500" />
                <span className="text-sm tabular-nums w-12 text-right" style={{ color: "#888" }}>{scale.toFixed(1)}x</span>
              </div>
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── UI primitives ──────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-lg border" style={{ borderColor: "#2a2a2a", backgroundColor: "rgba(255,255,255,0.02)" }}>
      <h3 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "#888" }}>{title}</h3>
      {children}
    </div>
  );
}

function MiniLabel({ children }: { children: React.ReactNode }) {
  return <span className="text-xs block mb-1 mt-2 first:mt-0" style={{ color: "#666" }}>{children}</span>;
}

function Swatch({ color }: { color: string }) {
  return <div className="w-8 h-8 rounded-md border shrink-0" style={{ backgroundColor: color, borderColor: "rgba(255,255,255,0.15)" }} />;
}

function Seg({ options, value, onChange }: { options: { value: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex rounded-md overflow-hidden border" style={{ borderColor: "#333" }}>
      {options.map((opt, i) => (
        <button key={opt.value} onClick={() => onChange(opt.value)} className="flex-1 text-sm py-1.5 px-2 transition-all" style={{ backgroundColor: value === opt.value ? "rgba(249,115,22,0.15)" : "rgba(255,255,255,0.03)", color: value === opt.value ? "#f97316" : "#999", borderRight: i < options.length - 1 ? "1px solid #333" : "none" }}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function EffectBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="text-sm px-3 py-2 rounded-md border transition-all text-left" style={{ borderColor: active ? "#f97316" : "rgba(255,255,255,0.1)", backgroundColor: active ? "rgba(249,115,22,0.1)" : "rgba(255,255,255,0.03)", color: active ? "#f97316" : "#ccc" }}>
      {label}
    </button>
  );
}
