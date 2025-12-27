import Link from "next/link";
import styles from "./page.module.css";

const features = [
  {
    title: "Precision Network Shield",
    description:
      "Harness EasyList, EasyPrivacy, and uBlock filter families with automatic delta updates and custom rule injection.",
  },
  {
    title: "Telemetry-Free Control",
    description:
      "No tracking, no analytics. Your preferences live only in the extension using secure browser storage.",
  },
  {
    title: "Dynamic Rule Engine",
    description:
      "Declarative Net Request rules rebuild in real time whenever you toggle a list or craft a custom filter expression.",
  },
];

const steps = [
  {
    title: "1 — Download",
    detail:
      "Grab the latest packaged build and unzip anywhere on your machine.",
  },
  {
    title: "2 — Load Unpacked",
    detail:
      "Open chrome://extensions, enable Developer Mode, then choose “Load unpacked” and select the folder.",
  },
  {
    title: "3 — Customize",
    detail:
      "Open the control center to enable or disable lists, add custom rules, and force refreshes.",
  },
];

const currentYear = new Date().getFullYear();

export default function Home() {
  return (
    <div className={styles.container}>
      <main className={styles.main}>
        <section className={styles.hero}>
          <p className={styles.badge}>uOrigin Advanced Shield</p>
          <h1 className={styles.title}>
            Enterprise-grade content blocking with uOrigin DNA.
          </h1>
          <p className={styles.subtitle}>
            A Chromium extension that mirrors the power of uBlock Origin with
            a modern rule compiler, automatic list refreshes, and instant
            toggles. Built for zero-trust browsing with no compromise on
            performance.
          </p>
          <div className={styles.ctaRow}>
            <Link
              className={styles.primaryCta}
              href="/uorigin-advanced-shield.zip"
            >
              Download Extension
            </Link>
            <a
              className={styles.secondaryCta}
              href="#instructions"
            >
              Installation Guide
            </a>
          </div>
        </section>

        <section className={styles.panel}>
          <h2 className={styles.sectionTitle}>Why it works</h2>
          <div className={styles.features}>
            {features.map((feature) => (
              <article key={feature.title} className={styles.featureCard}>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="instructions" className={styles.panel}>
          <h2 className={styles.sectionTitle}>Install in three steps</h2>
          <div className={styles.steps}>
            {steps.map((step) => (
              <div key={step.title} className={styles.stepCard}>
                <span className={styles.stepTitle}>{step.title}</span>
                <p>{step.detail}</p>
              </div>
            ))}
          </div>
          <div className={styles.hint}>
            After loading, pin the shield icon in Chrome for one-click access to
            live stats, filter toggles, and quick refresh.
          </div>
        </section>

        <section className={styles.panel}>
          <h2 className={styles.sectionTitle}>Feature parity highlights</h2>
          <div className={styles.grid}>
            <div className={styles.gridCard}>
              <h3>Autonomous updates</h3>
              <p>
                Background service worker fetches EasyList, EasyPrivacy, uBlock
                filters, and your custom lists every six hours or on demand.
              </p>
            </div>
            <div className={styles.gridCard}>
              <h3>Granular controls</h3>
              <p>
                Toggle each subscription, pause protection globally, or add
                allow/block rules using full uBlock syntax directly in the
                options dashboard.
              </p>
            </div>
            <div className={styles.gridCard}>
              <h3>Real-time insight</h3>
              <p>
                Popup surfaces the total number of blocked requests, active
                lists, and last synchronization timestamp with a single click.
              </p>
            </div>
          </div>
        </section>

        <section className={styles.panel}>
          <h2 className={styles.sectionTitle}>Developer Commands</h2>
          <pre className={styles.codeBlock}>
            {`# run the web demo locally
cd web
npm install
npm run lint
npm run build

# rebuild the extension archive
cd ..
python3 scripts/package_extension.py`}
          </pre>
          <p className={styles.codeHint}>
            The repository already includes a pre-built archive inside{" "}
            <code>public/uorigin-advanced-shield.zip</code> for convenience.
          </p>
        </section>
      </main>
      <footer className={styles.footer}>
        <span>© {currentYear} uOrigin Advanced Shield</span>
        <a href="https://github.com/gorhill/uBlock" target="_blank" rel="noreferrer">
          Inspired by uBlock Origin
        </a>
      </footer>
    </div>
  );
}
