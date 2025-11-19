'use client'

import { useEffect, useState } from "react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function LandingPage() {
  const [activeNav, setActiveNav] = useState("home")
  const [menuOpen, setMenuOpen] = useState(false)

  const navItems = [
    { id: "home", label: "Home" },
    { id: "about", label: "About" },
    { id: "how", label: "How it works" },
  ]

  const handleNavClick = (sectionId: string) => {
    setActiveNav(sectionId)
    setMenuOpen(false)
    const target = document.getElementById(sectionId)
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth"
    const sectionIds = ["home", "about", "how"]
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible?.target.id) {
          setActiveNav(visible.target.id)
        }
      },
      { threshold: [0.4] }
    )
    sectionIds.forEach((id) => {
      const element = document.getElementById(id)
      if (element) {
        observer.observe(element)
      }
    })
    return () => {
      document.documentElement.style.scrollBehavior = ""
      observer.disconnect()
    }
  }, [])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 640) {
        setMenuOpen(false)
      }
    }
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  return (
    <main className="min-h-screen bg-white text-neutral-950">
      <div className="sticky top-0 z-10 border-b border-neutral-200 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4 text-sm">
          <button
            onClick={() => handleNavClick("home")}
            className="text-sm font-semibold tracking-[0.3em] text-neutral-900 transition hover:opacity-70"
          >
            SALINTOOLS
          </button>
          <nav className="hidden gap-6 sm:flex">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={cn(
                  "relative px-1 py-0.5 text-sm transition-colors",
                  activeNav === item.id
                    ? "text-neutral-900"
                    : "text-neutral-600 hover:text-neutral-900"
                )}
              >
                <span>{item.label}</span>
                <span
                  className={cn(
                    "absolute inset-x-0 -bottom-1 h-0.5 rounded-full bg-neutral-900 transition-transform duration-200",
                    activeNav === item.id ? "scale-100" : "scale-0"
                  )}
                />
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="hidden rounded-full sm:inline-flex" asChild>
              <Link href="/tools">Launch tools</Link>
            </Button>
            <button
              className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 text-neutral-900 transition hover:opacity-70 sm:hidden"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation menu"
            >
              <span className="relative block h-4 w-5">
                <span
                  className={cn(
                    "absolute left-0 block h-0.5 w-full rounded-full bg-current transition-transform duration-300",
                    menuOpen ? "top-1/2 -translate-y-1/2 rotate-45" : "top-0"
                  )}
                />
                <span
                  className={cn(
                    "absolute left-0 block h-0.5 w-full rounded-full bg-current transition-all duration-200",
                    menuOpen ? "opacity-0" : "top-1/2 -translate-y-1/2"
                  )}
                />
                <span
                  className={cn(
                    "absolute left-0 block h-0.5 w-full rounded-full bg-current transition-transform duration-300",
                    menuOpen ? "top-1/2 -translate-y-1/2 -rotate-45" : "bottom-0"
                  )}
                />
              </span>
            </button>
          </div>
        </div>
        <div
          className={cn(
            "sm:hidden overflow-hidden transition-all duration-300",
            menuOpen ? "max-h-[420px] border-b border-neutral-200" : "max-h-0"
          )}
        >
          <div className="flex flex-col gap-3 px-4 py-5 bg-white/95 backdrop-blur-md">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={cn(
                  "flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-medium transition",
                  activeNav === item.id
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-200 bg-white text-neutral-900"
                )}
              >
                {item.label}
                <span className="text-xs uppercase tracking-[0.3em]">→</span>
              </button>
            ))}
            <Button className="rounded-2xl" asChild>
              <Link href="/tools">Launch tools</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto flex max-w-5xl flex-col gap-20 px-4 py-16 sm:px-6">
        <section id="home" className="space-y-6 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-neutral-500 animate-fade-in">
            Creative utilities
          </p>
          <h1 className="text-4xl font-semibold tracking-tight text-neutral-900 sm:text-5xl animate-slide-up animate-delay-100">
            Clean tools for quick visual fixes
          </h1>
          <p className="mx-auto max-w-2xl text-base text-neutral-600 animate-slide-up animate-delay-200">
            Remove backgrounds or convert formats on a calm, minimal canvas. No clutter, no noise—just focused controls that get out of the way.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Button className="rounded-full px-8 py-5 animate-slide-up animate-delay-200" asChild>
              <Link href="/tools">Get started</Link>
            </Button>
            <Button variant="ghost" className="rounded-full px-8 py-5 animate-slide-up animate-delay-300" asChild>
              <a href="#about">Learn more</a>
            </Button>
          </div>
        </section>

        <section id="about" className="space-y-6">
          <div className="space-y-2 animate-slide-up">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-neutral-500">
              About
            </p>
            <h2 className="text-2xl font-semibold text-neutral-900">Why SalinTools?</h2>
            <p className="max-w-3xl text-sm text-neutral-600">
              Purpose-built helpers for makers, designers, and marketers who just need the basics done right - fast, private, and beautiful.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { title: "Minimal UI", description: "Shadcn-based interface that stays calm and modern while you work." },
              { title: "Instant preview", description: "See changes in real time with side-by-side previews for every action." },
              { title: "Fast & private", description: "Process images quickly without storing your files. Your privacy matters." },
            ].map((feature, index) => (
              <div key={feature.title} className={cn(
                "rounded-2xl border border-neutral-200 bg-white p-6 text-sm transition-all hover:shadow-sm",
                "animate-slide-up",
                index === 0 && "animate-delay-100",
                index === 1 && "animate-delay-200",
                index === 2 && "animate-delay-300"
              )}>
                <p className="text-base font-semibold text-neutral-900">{feature.title}</p>
                <p className="mt-2 text-sm text-neutral-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="space-y-6">
          <div className="space-y-2 animate-slide-up">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-neutral-500">
              How it works
            </p>
            <h2 className="text-2xl font-semibold text-neutral-900">Three simple steps</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { step: "01", title: "Upload", description: "Drag an image or browse from your device." },
              { step: "02", title: "Process", description: "Choose your tool and let us handle the conversion." },
              { step: "03", title: "Download", description: "Get your processed file instantly, ready to use." },
            ].map((item, index) => (
              <div key={item.step} className={cn(
                "rounded-2xl border border-neutral-200 bg-white p-6 text-sm transition-all hover:shadow-sm",
                "animate-slide-up",
                index === 0 && "animate-delay-100",
                index === 1 && "animate-delay-200",
                index === 2 && "animate-delay-300"
              )}>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-400">
                  {item.step}
                </p>
                <p className="mt-2 text-base font-semibold text-neutral-900">{item.title}</p>
                <p className="mt-2 text-sm text-neutral-600">{item.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6 text-center py-12">
          <div className="space-y-4 animate-slide-up">
            <h2 className="text-2xl font-semibold text-neutral-900">Ready to get started?</h2>
            <p className="text-sm text-neutral-600">
              Start processing your images with our clean, minimalist tools.
            </p>
            <Button className="rounded-full px-8 py-5" asChild>
              <Link href="/tools">Launch tools</Link>
            </Button>
          </div>
        </section>
      </div>

      <footer className="border-t border-neutral-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-8 text-center">
          <p className="text-sm text-neutral-500">
            Made by Ken with ❤️
          </p>
        </div>
      </footer>
    </main>
  )
}
