<script setup>
const uspPoints = [
  { key: 'about_usp_1' },
  { key: 'about_usp_2' },
  { key: 'about_usp_3' },
  { key: 'about_usp_4' }
]

const pillars = [
  { id: 1, icon: '✦', titleKey: 'about_pillar_1_title', descKey: 'about_pillar_1_desc' },
  { id: 2, icon: '◆', titleKey: 'about_pillar_2_title', descKey: 'about_pillar_2_desc' },
  { id: 3, icon: '❂', titleKey: 'about_pillar_3_title', descKey: 'about_pillar_3_desc' }
]

const timeline = [
  { id: 1, labelKey: 'about_timeline_1_label', descKey: 'about_timeline_1_desc' },
  { id: 2, labelKey: 'about_timeline_2_label', descKey: 'about_timeline_2_desc' },
  { id: 3, labelKey: 'about_timeline_3_label', descKey: 'about_timeline_3_desc' },
  { id: 4, labelKey: 'about_timeline_4_label', descKey: 'about_timeline_4_desc' }
]

const team = [
  { id: 1, nameKey: 'about_team_1_name', roleKey: 'about_team_1_role', expKey: 'about_team_1_exp' },
  { id: 2, nameKey: 'about_team_2_name', roleKey: 'about_team_2_role', expKey: 'about_team_2_exp' },
  { id: 3, nameKey: 'about_team_3_name', roleKey: 'about_team_3_role', expKey: 'about_team_3_exp' }
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

          <div class="story-visual">
            <div class="visual-card glass">
              <div class="visual-glow"></div>
              <div class="visual-placeholder">
                <span class="placeholder-icon">🏛️</span>
                <span class="placeholder-text">{{ $t('about_placeholder_text') }}</span>
              </div>
              <div class="visual-overlay">
                <span class="visual-badge">{{ $t('about_visual_badge') }}</span>
              </div>
            </div>
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

    <!-- ارزش‌های برند -->
    <div class="values-section">
      <div class="container">
        <div class="section-header">
          <span class="section-badge">{{ $t('about_values_badge') }}</span>
          <h2 class="section-title">{{ $t('about_values_title') }}</h2>
          <p class="section-desc">{{ $t('about_values_desc') }}</p>
        </div>

        <div class="values-grid">
          <article v-for="pillar in pillars" :key="pillar.id" class="value-card glass">
            <div class="value-icon">{{ pillar.icon }}</div>
            <h3 class="value-title">{{ $t(pillar.titleKey) }}</h3>
            <p class="value-desc">{{ $t(pillar.descKey) }}</p>
            <div class="value-line"></div>
          </article>
        </div>
      </div>
    </div>

    <!-- فرآیند ساخت -->
    <div class="process-section">
      <div class="container">
        <div class="section-header">
          <span class="section-badge">{{ $t('about_process_badge') }}</span>
          <h2 class="section-title">{{ $t('about_process_title') }}</h2>
          <p class="section-desc">{{ $t('about_process_desc') }}</p>
        </div>

        <div class="timeline">
          <div v-for="step in timeline" :key="step.id" class="timeline-item">
            <div class="timeline-marker">
              <span class="marker-number">{{ step.id }}</span>
              <span class="marker-line" v-if="step.id !== timeline.length"></span>
            </div>
            <div class="timeline-content glass">
              <h4 class="step-title">{{ $t(step.labelKey) }}</h4>
              <p class="step-desc">{{ $t(step.descKey) }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- تیم -->
    <div class="team-section">
      <div class="container">
        <div class="section-header">
          <span class="section-badge">{{ $t('about_team_badge') }}</span>
          <h2 class="section-title">{{ $t('about_team_title') }}</h2>
          <p class="section-desc">{{ $t('about_team_desc') }}</p>
        </div>

        <div class="team-grid">
          <article v-for="member in team" :key="member.id" class="team-card glass">
            <div class="member-image">
              <div class="image-placeholder">
                <span>{{ $t(member.nameKey).charAt(0) }}</span>
              </div>
            </div>
            <div class="member-info">
              <h4 class="member-name">{{ $t(member.nameKey) }}</h4>
              <span class="member-role">{{ $t(member.roleKey) }}</span>
              <span class="member-exp">{{ $t(member.expKey) }}</span>
            </div>
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
  /* direction: rtl حذف شد */
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
}

.title-highlight {
  display: block;
  font-weight: 700;
  background: linear-gradient(135deg, #c5a059, #facc6b);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.hero-desc {
  font-size: 1.15rem;
  line-height: 1.9;
  opacity: 0.9;
  max-width: 600px;
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
  display: grid;
  grid-template-columns: 1.2fr 1fr;
  gap: 60px;
  align-items: center;
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
  margin-bottom: 24px;
}

.usp-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
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
  border-radius: 50%;
  background: rgba(197,160,89,0.2);
  border: 1px solid rgba(197,160,89,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #facc6b;
  font-size: 0.75rem;
}

.story-visual {
  position: relative;
}

.visual-card {
  position: relative;
  border-radius: 24px;
  overflow: hidden;
  background: rgba(5,8,20,0.8);
  border: 1px solid rgba(255,255,255,0.1);
  height: 400px;
}

.visual-glow {
  position: absolute;
  inset: -50%;
  background: radial-gradient(circle at center, rgba(197,160,89,0.3), transparent 50%);
  animation: glowPulse 4s ease-in-out infinite;
}

@keyframes glowPulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 0.8; }
}

.visual-placeholder {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.placeholder-icon {
  font-size: 5rem;
}

.placeholder-text {
  font-size: 1.2rem;
  opacity: 0.7;
}

.visual-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20px;
  background: linear-gradient(to top, rgba(5,8,20,0.95), transparent);
}

.visual-badge {
  padding: 6px 12px;
  border-radius: 999px;
  background: rgba(197,160,89,0.2);
  border: 1px solid rgba(197,160,89,0.5);
  font-size: 0.8rem;
  color: #facc6b;
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

/* ارزش‌ها */
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
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.value-card {
  padding: 30px;
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
  line-height: 1.8;
  opacity: 0.8;
  margin: 0;
}

.value-line {
  width: 40px;
  height: 2px;
  background: linear-gradient(to right, #c5a059, transparent);
  margin: 20px auto 0;
}

/* فرآیند */
.process-section {
  padding: 100px 0;
  background: radial-gradient(circle at center, rgba(197,160,89,0.08), transparent 60%);
}

.timeline {
  max-width: 700px;
  margin: 0 auto;
}

.timeline-item {
  display: flex;
  gap: 24px;
  margin-bottom: 24px;
}

.timeline-marker {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.marker-number {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #c5a059, #8f7032);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: #000;
  box-shadow: 0 4px 20px rgba(197,160,89,0.4);
}

.marker-line {
  flex: 1;
  width: 2px;
  background: linear-gradient(to bottom, rgba(197,160,89,0.6), transparent);
  margin-top: 8px;
}

.timeline-content {
  flex: 1;
  padding: 20px 24px;
  border-radius: 16px;
  background: rgba(5,8,20,0.8);
  border: 1px solid rgba(255,255,255,0.08);
}

.step-title {
  font-size: 1.05rem;
  margin: 0 0 8px;
  color: #facc6b;
}

.step-desc {
  font-size: 0.9rem;
  line-height: 1.8;
  opacity: 0.85;
  margin: 0;
}

/* تیم */
.team-section {
  padding: 100px 0;
}

.team-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
}

.team-card {
  padding: 30px;
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

.member-image {
  margin-bottom: 20px;
}

.image-placeholder {
  width: 100px;
  height: 100px;
  margin: 0 auto;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(197,160,89,0.3), rgba(197,160,89,0.1));
  border: 2px solid rgba(197,160,89,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 700;
  color: #facc6b;
}

.member-name {
  font-size: 1.1rem;
  margin: 0 0 6px;
}

.member-role {
  display: block;
  font-size: 0.9rem;
  color: #facc6b;
  margin-bottom: 4px;
}

.member-exp {
  font-size: 0.8rem;
  opacity: 0.7;
}

/* CTA */
.cta-section {
  padding: 80px 0 100px;
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
  
  .story-layout {
    grid-template-columns: 1fr;
    gap: 40px;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .values-grid,
  .team-grid {
    grid-template-columns: repeat(2, 1fr);
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
  .values-section,
  .process-section,
  .team-section {
    padding: 60px 0;
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