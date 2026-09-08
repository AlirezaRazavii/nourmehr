<script setup>
const uspPoints = [
  { key: 'about_usp_1' },
  { key: 'about_usp_2' },
  { key: 'about_usp_3' },
  { key: 'about_usp_4' }
]

const crafts = [
  { id: 1, icon: '◈', titleKey: 'about_craft_1_title', descKey: 'about_craft_1_desc' },
  { id: 2, icon: '❖', titleKey: 'about_craft_2_title', descKey: 'about_craft_2_desc' },
  { id: 3, icon: '✦', titleKey: 'about_craft_3_title', descKey: 'about_craft_3_desc' },
  { id: 4, icon: '❂', titleKey: 'about_craft_4_title', descKey: 'about_craft_4_desc' }
]

const partners = [
  { id: 1, nameKey: 'about_partner_1_name', typeKey: 'about_partner_1_type' },
  { id: 2, nameKey: 'about_partner_2_name', typeKey: 'about_partner_2_type' },
  { id: 3, nameKey: 'about_partner_3_name', typeKey: 'about_partner_3_type' },
  { id: 4, nameKey: 'about_partner_4_name', typeKey: 'about_partner_4_type' }
]

const stats = [
  { valueKey: 'about_stat_1_value', labelKey: 'about_stat_1_label' },
  { valueKey: 'about_stat_2_value', labelKey: 'about_stat_2_label' },
  { valueKey: 'about_stat_3_value', labelKey: 'about_stat_3_label' },
  { valueKey: 'about_stat_4_value', labelKey: 'about_stat_4_label' }
]
</script>

<template>
  <section class="about-page">
    <!-- هیرو -->
    <div class="hero-section">
      <div class="hero-bg"></div>
      <div class="hero-overlay"></div>

      <div class="hero-content">
        <span class="hero-badge glass">{{ $t('about_badge') }}</span>
        <h1 class="hero-title">
          <span class="title-line">{{ $t('about_title_1') }}</span>
          <span class="title-highlight">{{ $t('about_title_2') }}</span>
          <span class="title-line">{{ $t('about_title_3') }}</span>
        </h1>
        <p class="hero-desc">
          {{ $t('about_hero_desc') }}
        </p>
      </div>

      <div class="scroll-indicator">
        <span>{{ $t('about_scroll') }}</span>
        <div class="scroll-line"></div>
      </div>
    </div>

    <!-- بخش داستان -->
    <div class="story-section">
      <div class="container">
        <div class="story-layout">
          <div class="story-content">
            <span class="section-badge">{{ $t('about_story_badge') }}</span>
            <h2 class="section-title">{{ $t('about_story_title') }}</h2>

            <p class="story-lead">
              {{ $t('about_story_lead') }}
            </p>

            <p class="story-text">
              {{ $t('about_story_text') }}
            </p>

            <ul class="usp-list">
              <li v-for="(item, index) in uspPoints" :key="index">
                <span class="check">✓</span>
                <span>{{ $t(item.key) }}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- آمار -->
    <div class="stats-section">
      <div class="container">
        <div class="stats-grid">
          <div v-for="(stat, index) in stats" :key="index" class="stat-card glass">
            <span class="stat-value">{{ $t(stat.valueKey) }}</span>
            <span class="stat-label">{{ $t(stat.labelKey) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- هنرهای نورمهر -->
    <div class="values-section">
      <div class="container">
        <div class="section-header">
          <span class="section-badge">{{ $t('about_crafts_badge') }}</span>
          <h2 class="section-title">{{ $t('about_crafts_title') }}</h2>
          <p class="section-desc">{{ $t('about_crafts_desc') }}</p>
        </div>

        <div class="values-grid">
          <article v-for="craft in crafts" :key="craft.id" class="value-card glass">
            <div class="value-icon">{{ craft.icon }}</div>
            <h3 class="value-title">{{ $t(craft.titleKey) }}</h3>
            <p class="value-desc">{{ $t(craft.descKey) }}</p>
            <div class="value-line"></div>
          </article>
        </div>
      </div>
    </div>

    <!-- شعبه‌ها -->
    <div class="branches-section">
      <div class="container">
        <div class="branches-card glass">
          <div class="branches-figure">
            <span class="branches-number">5</span>
            <span class="branches-ring"></span>
          </div>
          <div class="branches-body">
            <span class="section-badge">{{ $t('about_branches_badge') }}</span>
            <h2 class="branches-title">{{ $t('about_branches_title') }}</h2>
            <p class="branches-desc">{{ $t('about_branches_desc') }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- سازمان‌های همکار -->
    <div class="team-section">
      <div class="container">
        <div class="section-header">
          <span class="section-badge">{{ $t('about_partners_badge') }}</span>
          <h2 class="section-title">{{ $t('about_partners_title') }}</h2>
          <p class="section-desc">{{ $t('about_partners_desc') }}</p>
        </div>

        <div class="team-grid">
          <article v-for="p in partners" :key="p.id" class="team-card glass">
            <h4 class="member-name">{{ $t(p.nameKey) }}</h4>
            <span class="member-role">{{ $t(p.typeKey) }}</span>
            <div class="member-line"></div>
          </article>
        </div>
      </div>
    </div>

    <!-- CTA -->
    <div class="cta-section">
      <div class="container">
        <div class="cta-card glass">
          <div class="cta-content">
            <h2>{{ $t('about_cta_title') }}</h2>
            <p>{{ $t('about_cta_desc') }}</p>
          </div>
          <div class="cta-actions">
            <router-link to="/contact" class="cta-btn primary">{{ $t('about_cta_btn1') }}</router-link>
            <router-link to="/products" class="cta-btn secondary">{{ $t('about_cta_btn2') }}</router-link>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.about-page {
  min-height: 100vh;
  background: #050814;
  color: #fff;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 40px;
}

/* هیرو */
.hero-section {
  position: relative;
  height: 100vh;
  min-height: 600px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at top, rgba(197,160,89,0.25), transparent 50%),
              radial-gradient(circle at bottom right, rgba(56,189,248,0.15), transparent 50%);
}

.hero-overlay {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at bottom, #050814, transparent);
}

.hero-content {
  position: relative;
  text-align: center;
  max-width: 800px;
  padding: 0 20px;
}

.hero-badge {
  display: inline-block;
  padding: 8px 20px;
  border-radius: 999px;
  background: rgba(5,8,20,0.8);
  border: 1px solid rgba(197,160,89,0.5);
  font-size: 0.85rem;
  color: #facc6b;
  margin-bottom: 24px;
}

.hero-title {
  font-size: 3.5rem;
  line-height: 1.3;
  margin: 0 0 24px;
}

.title-line {
  display: block;
  font-weight: 300;
  font-size: 0.5em;
  opacity: 0.85;
}

.title-highlight {
  display: block;
  font-weight: 700;
  background: linear-gradient(135deg, #c5a059, #facc6b);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  margin: 6px 0;
}

.hero-desc {
  font-size: 1.15rem;
  line-height: 1.9;
  opacity: 0.9;
  max-width: 640px;
  margin: 0 auto;
}

.scroll-indicator {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  font-size: 0.75rem;
  opacity: 0.6;
}

.scroll-line {
  width: 1px;
  height: 40px;
  background: linear-gradient(to bottom, #c5a059, transparent);
  animation: scrollPulse 2s ease-in-out infinite;
}

@keyframes scrollPulse {
  0%, 100% { opacity: 0.3; height: 40px; }
  50% { opacity: 1; height: 60px; }
}

/* بخش داستان */
.story-section {
  padding: 100px 0;
}

.story-layout {
  max-width: 860px;
  margin: 0 auto;
  text-align: center;
}

.section-badge {
  display: inline-block;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(197,160,89,0.15);
  color: #facc6b;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 1px;
  margin-bottom: 12px;
}

.section-title {
  font-size: 2.2rem;
  margin: 0 0 20px;
}

.story-lead {
  font-size: 1.1rem;
  line-height: 1.9;
  margin-bottom: 16px;
  color: rgba(255,255,255,0.95);
}

.story-text {
  font-size: 0.95rem;
  line-height: 2;
  opacity: 0.85;
  margin-bottom: 34px;
}

.usp-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px 24px;
  text-align: start;
}

.usp-list li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.9rem;
}

.check {
  width: 22px;
  height: 22px;
  flex: none;
  border-radius: 50%;
  background: rgba(197,160,89,0.2);
  border: 1px solid rgba(197,160,89,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #facc6b;
  font-size: 0.75rem;
}

/* آمار */
.stats-section {
  padding: 60px 0;
  background: linear-gradient(180deg, transparent, rgba(197,160,89,0.05), transparent);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

.stat-card {
  text-align: center;
  padding: 30px 20px;
  border-radius: 20px;
  background: rgba(5,8,20,0.8);
  border: 1px solid rgba(255,255,255,0.08);
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-8px);
  border-color: rgba(197,160,89,0.5);
  box-shadow: 0 20px 40px rgba(0,0,0,0.5);
}

.stat-value {
  display: block;
  font-size: 2.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, #c5a059, #facc6b);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  margin-bottom: 8px;
}

.stat-label {
  font-size: 0.9rem;
  opacity: 0.8;
}

/* هنرها */
.values-section {
  padding: 100px 0;
}

.section-header {
  text-align: center;
  margin-bottom: 50px;
}

.section-desc {
  font-size: 1rem;
  opacity: 0.8;
  margin-top: 8px;
}

.values-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

.value-card {
  padding: 30px 24px;
  border-radius: 20px;
  background: rgba(5,8,20,0.8);
  border: 1px solid rgba(255,255,255,0.08);
  text-align: center;
  transition: all 0.3s ease;
}

.value-card:hover {
  transform: translateY(-8px);
  border-color: rgba(197,160,89,0.5);
}

.value-icon {
  width: 60px;
  height: 60px;
  margin: 0 auto 20px;
  border-radius: 50%;
  background: rgba(197,160,89,0.15);
  border: 1px solid rgba(197,160,89,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: #facc6b;
}

.value-title {
  font-size: 1.15rem;
  margin: 0 0 12px;
}

.value-desc {
  font-size: 0.9rem;
  line-height: 1.9;
  opacity: 0.8;
  margin: 0;
}

.value-line {
  width: 40px;
  height: 2px;
  background: linear-gradient(to right, #c5a059, transparent);
  margin: 20px auto 0;
}

/* شعبه‌ها */
.branches-section {
  padding: 40px 0 100px;
}

.branches-card {
  display: flex;
  align-items: center;
  gap: 50px;
  padding: 50px;
  border-radius: 24px;
  background:
    radial-gradient(circle at 15% 50%, rgba(197,160,89,0.16), transparent 60%),
    rgba(5,8,20,0.9);
  border: 1px solid rgba(255,255,255,0.08);
  transition: all 0.3s ease;
}

.branches-card:hover {
  border-color: rgba(197,160,89,0.45);
  box-shadow: 0 24px 50px rgba(0,0,0,0.5);
}

.branches-figure {
  position: relative;
  flex: none;
  width: 150px;
  height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.branches-number {
  font-size: 4.5rem;
  font-weight: 700;
  line-height: 1;
  background: linear-gradient(135deg, #c5a059, #facc6b);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.branches-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1px solid rgba(197,160,89,0.4);
  border-top-color: rgba(197,160,89,0.9);
  animation: ringSpin 12s linear infinite;
}

@keyframes ringSpin {
  to { transform: rotate(360deg); }
}

.branches-title {
  font-size: 1.8rem;
  margin: 0 0 12px;
}

.branches-desc {
  font-size: 0.95rem;
  line-height: 2;
  opacity: 0.8;
  margin: 0;
  max-width: 620px;
}

/* سازمان‌های همکار */
.team-section {
  padding: 0 0 100px;
}

.team-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

.team-card {
  padding: 36px 24px;
  border-radius: 20px;
  background: rgba(5,8,20,0.8);
  border: 1px solid rgba(255,255,255,0.08);
  text-align: center;
  transition: all 0.3s ease;
}

.team-card:hover {
  transform: translateY(-8px);
  border-color: rgba(197,160,89,0.5);
}

.member-name {
  font-size: 1.05rem;
  line-height: 1.9;
  margin: 0 0 8px;
}

.member-role {
  display: block;
  font-size: 0.82rem;
  color: #facc6b;
  opacity: 0.85;
}

.member-line {
  width: 40px;
  height: 2px;
  background: linear-gradient(to right, #c5a059, transparent);
  margin: 20px auto 0;
}

/* CTA */
.cta-section {
  padding: 0 0 100px;
}

.cta-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 40px;
  padding: 50px;
  border-radius: 24px;
  background:
    linear-gradient(135deg, rgba(197,160,89,0.15), transparent),
    rgba(5,8,20,0.9);
  border: 1px solid rgba(197,160,89,0.3);
  box-shadow: 0 30px 60px rgba(0,0,0,0.5);
}

.cta-content h2 {
  font-size: 1.8rem;
  margin: 0 0 8px;
}

.cta-content p {
  font-size: 1rem;
  opacity: 0.8;
  margin: 0;
}

.cta-actions {
  display: flex;
  gap: 16px;
}

.cta-btn {
  padding: 14px 28px;
  border-radius: 999px;
  font-size: 0.95rem;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;
  transition: all 0.3s ease;
}

.cta-btn.primary {
  background: linear-gradient(135deg, #c5a059, #8f7032);
  color: #000;
  box-shadow: 0 4px 20px rgba(197,160,89,0.4);
}

.cta-btn.primary:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 30px rgba(197,160,89,0.6);
}

.cta-btn.secondary {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.3);
  color: #fff;
}

.cta-btn.secondary:hover {
  background: rgba(255,255,255,0.1);
  border-color: rgba(255,255,255,0.5);
}

/* Glass effect */
.glass {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

/* ریسپانسیو */
@media (max-width: 1024px) {
  .container {
    padding: 0 30px;
  }

  .hero-title {
    font-size: 2.8rem;
  }

  .stats-grid,
  .values-grid,
  .team-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .branches-card {
    gap: 32px;
    padding: 40px;
  }
}

@media (max-width: 768px) {
  .container {
    padding: 0 20px;
  }

  .hero-section {
    height: auto;
    min-height: 100vh;
    padding: 120px 0 80px;
  }

  .hero-title {
    font-size: 2rem;
  }

  .hero-desc {
    font-size: 1rem;
  }

  .story-section,
  .values-section {
    padding: 60px 0;
  }

  .branches-section {
    padding: 20px 0 60px;
  }

  .team-section,
  .cta-section {
    padding: 0 0 60px;
  }

  .section-title {
    font-size: 1.8rem;
  }

  .usp-list {
    grid-template-columns: 1fr;
  }

  .stats-grid,
  .values-grid,
  .team-grid {
    grid-template-columns: 1fr;
  }

  .branches-card {
    flex-direction: column;
    text-align: center;
    padding: 34px 24px;
  }

  .branches-desc {
    margin-inline: auto;
  }

  .branches-figure {
    width: 120px;
    height: 120px;
  }

  .branches-number {
    font-size: 3.4rem;
  }

  .branches-title {
    font-size: 1.5rem;
  }

  .cta-card {
    flex-direction: column;
    text-align: center;
    padding: 30px;
  }

  .cta-actions {
    flex-direction: column;
    width: 100%;
  }

  .cta-btn {
    width: 100%;
    text-align: center;
  }

  .scroll-indicator {
    display: none;
  }
}
</style>
