"use client";

import Image, { type StaticImageData } from "next/image";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { ArrowDownRight, Boxes, Orbit, Sparkles } from "lucide-react";
import { useRef } from "react";
import capsuleImage from "../../public/art/creator-capsule-v2.webp";
import worldImage from "../../public/art/digital-world-v2.webp";

type SceneProps = {
  index: string;
  eyebrow: string;
  title: string;
  description: string;
  image: StaticImageData;
  icon: "orbit" | "boxes";
  reverse?: boolean;
  lightArtwork?: boolean;
};

function ScrollScene({ index, eyebrow, title, description, image, icon, reverse, lightArtwork }: SceneProps) {
  const sceneRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sceneRef, offset: ["start end", "end start"] });
  const progress = useSpring(scrollYProgress, { stiffness: 75, damping: 24, mass: 0.35 });
  const imageY = useTransform(progress, [0, 1], [110, -110]);
  const imageRotate = useTransform(progress, [0, 0.5, 1], reverse ? [-7, 2, 8] : [8, -2, -7]);
  const imageScale = useTransform(progress, [0, 0.5, 1], [0.88, 1.03, 0.92]);
  const copyY = useTransform(progress, [0, 1], [55, -45]);
  const haloRotate = useTransform(progress, [0, 1], [0, reverse ? -150 : 150]);
  const Icon = icon === "orbit" ? Orbit : Boxes;

  return (
    <motion.article
      ref={sceneRef}
      className={`scroll-scene${reverse ? " scroll-scene-reverse" : ""}${lightArtwork ? " scroll-scene-light-art" : ""}`}
      initial={{ opacity: 0, y: 70 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-12%" }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div className="scene-copy" style={{ y: copyY }}>
        <span className="scene-index">{index}</span>
        <span className="scene-eyebrow"><Sparkles size={13} /> {eyebrow}</span>
        <h3>{title}</h3>
        <p>{description}</p>
        <span className="scene-detail"><Icon size={16} /> Built to be explored, not just viewed</span>
      </motion.div>

      <div className="scene-visual" aria-hidden="true">
        <motion.div className="scene-halo scene-halo-one" style={{ rotate: haloRotate }} />
        <motion.div className="scene-halo scene-halo-two" style={{ rotate: haloRotate }} />
        <motion.div
          className="scene-image-card"
          style={{ y: imageY, rotateY: imageRotate, scale: imageScale }}
        >
          <Image src={image} alt="" fill sizes="(max-width: 800px) 92vw, 58vw" placeholder="blur" />
          <span className="scene-glass-label"><i /> LIVE DIMENSION</span>
        </motion.div>
        <span className="scene-float scene-float-one" />
        <span className="scene-float scene-float-two" />
        <span className="scene-float scene-float-three"><ArrowDownRight size={20} /></span>
      </div>
    </motion.article>
  );
}

export function ImmersiveScenes() {
  return (
    <section className="dimension-section">
      <div className="dimension-intro page-shell">
        <span>Scroll-driven worlds</span>
        <p>Every layer has a different depth, velocity, and point of view.</p>
      </div>
      <div className="page-shell dimension-stack">
        <ScrollScene
          index="01 / 02"
          eyebrow="From signal to system"
          title="Ideas gain gravity."
          description="Prompts, decisions, code, and outcomes orbit the same core—so you can see how an experiment becomes something real."
          image={capsuleImage}
          icon="boxes"
        />
        <ScrollScene
          index="02 / 02"
          eyebrow="Worlds you can enter"
          title="Build beyond the flat screen."
          description="Explore dimensional websites, playable prototypes, and complete source systems designed to be opened, remixed, and shipped."
          image={worldImage}
          icon="orbit"
          reverse
          lightArtwork
        />
      </div>
    </section>
  );
}
