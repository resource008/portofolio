import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { Flip } from "gsap/Flip";

let initialized = false;

if (!initialized) {
  gsap.registerPlugin(CustomEase, Flip);

  CustomEase.create("sidebar", "0.76, 0, 0.24, 1");
  CustomEase.create("soft", "0.22, 1, 0.36, 1");

  initialized = true;
}

export { gsap, CustomEase, Flip };