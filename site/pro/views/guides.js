/* Guides : liste, langues, départs de la semaine, chevauchements, jours non disponibles ; ajout / modification (admin) */
window.TC = window.TC || {};
(function (TC) {
  const t = TC.t, U = TC.u;
  TC.views = TC.views || {};
  const LANG_KEYS = ['en', 'it', 'fr', 'es', 'de', 'pt', 'nl', 'zh', 'ja', 'ko'];
  const G = { guides: [], deps: [], avail: [], editing: null };
  const minutes = d => Math.min(Math.max((d.activity && d.activity.duration_minutes) || 120, 30), 720);

  function conflicts(gid) {
    const list = G.deps.filter(d => d.guide_id === gid).sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
    const out = [];
    for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
      const a = list[i], b = list[j];
      if (new Date(b.starts_at).getTime() < new Date(a.starts_at).getTime() + minutes(a) * 60000) out.push([a, b]);
    }
    return out;
  }

  function form() {
    const g = G.editing ? G.guides.find(x => x.id === G.editing) : null, isAdmin = TC.state.me.role === 'admin';
    if (!isAdmin) return '';
    return `<form id="guideForm" class="card pad" novalidate style="display:flex;flex-direction:column;gap:12px;max-width:760px;margin-top:16px">
      <h2 style="font-size:16px">${g ? t('gd_form_edit') : t('gd_form')}</h2>
      <div class="row">
        <div class="field"><label for="g-first">${t('gd_name')}</label><input id="g-first" value="${U.esc(g ? g.first_name : '')}" maxlength="100" required aria-describedby="e-g-first"><span class="err" id="e-g-first"></span></div>
        <div class="field"><label for="g-last">${t('gd_last')}</label><input id="g-last" value="${U.esc(g && g.last_name ? g.last_name : '')}" maxlength="100"></div>
      </div>
      <fieldset style="border:none;padding:0;margin:0"><legend class="lbl" style="margin-bottom:6px">${t('gd_langs')}</legend>
        <div style="display:flex;flex-wrap:wrap;gap:4px 16px">${LANG_KEYS.map(l => `<label style="display:flex;align-items:center;gap:6px;min-height:36px"><input type="checkbox" name="g-lang" value="${l}" ${g && g.languages.includes(l) ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--accent)"> ${U.esc(U.langName(l))}</label>`).join('')}</div>
        <span class="err" id="e-g-langs" role="alert"></span></fieldset>
      <label style="display:flex;align-items:center;gap:8px;min-height:36px;font-weight:600"><input type="checkbox" id="g-active" ${!g || g.is_active ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--accent)"> ${t('gd_active')}</label>
      <span class="err" id="e-g-form" role="alert"></span>
      <div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" type="submit">${g ? t('gd_save') : t('gd_add')}</button>
        ${g ? `<button class="btn quiet" type="button" id="gCancel">${t('it_cancel')}</button>` : ''}</div>
      ${g ? `<p class="sub" style="font-size:13px;margin:0">${t('gd_account', { id: g.id })}</p>` : ''}
    </form>`;
  }

  TC.views.guides = {
    load: async () => {
      const week = U.mondayOf(U.todayRome()), today = U.todayRome();
      const [guides, deps, avail] = await Promise.all([TC.api.guides(), TC.api.guideDeparturesForGuides(U.romeToIso(week, '00:00'), U.romeToIso(U.addDays(week, 7), '00:00')), TC.api.availability(today, U.addDays(today, 13))]);
      Object.assign(G, { guides, deps, avail });
    },
    html: () => {
      const isAdmin = TC.state.me.role === 'admin';
      const rows = G.guides.map(g => {
        const n = G.deps.filter(d => d.guide_id === g.id).length, c = conflicts(g.id);
        const off = G.avail.filter(a => a.guide_id === g.id && a.available === false).map(a => U.dayLabel(a.day));
        return `<tr><td><strong>${U.esc(U.guideName(g))}</strong>${g.is_active ? '' : ` <span class="badge src">${t('gd_inactive')}</span>`}</td>
          <td>${g.languages.map(l => U.esc(U.langName(l))).join(', ')}</td><td class="num">${n}</td>
          <td>${c.length ? c.map(([a, b]) => `<span class="late">${U.esc(U.dayLabel(U.romeDay(a.starts_at)))} ${U.romeTime(a.starts_at)} / ${U.romeTime(b.starts_at)}</span>`).join('<br>') : `<span class="sub">${t('gd_no_conflict')}</span>`}</td>
          <td>${off.length ? U.esc(off.join(', ')) : `<span class="sub">${t('gd_avail_none')}</span>`}</td>
          ${isAdmin ? `<td><button type="button" class="linkbtn" data-gedit="${g.id}">${t('it_edit')}<span class="sr"> ${U.esc(U.guideName(g))}</span></button></td>` : ''}</tr>`;
      }).join('');
      return U.shell('guides', `
        <div class="page-head"><div><h1>${t('gd_t')}</h1><p class="sub">${t('gd_d')}</p></div></div>
        ${G.guides.length ? `<div class="card tscroll"><table class="t"><thead><tr><th>${t('gd_name')}</th><th>${t('gd_langs')}</th><th class="num">${t('gd_week')}</th><th>${t('gd_conflicts')}</th><th>${t('gd_avail')}</th>${isAdmin ? '<th><span class="sr">Actions</span></th>' : ''}</tr></thead><tbody>${rows}</tbody></table></div>`
          : `<p class="empty">${t('gd_none')}</p>`}
        ${form()}`);
    },
    bind: () => {
      const f = U.$('#guideForm'); if (!f) return;
      U.$('#main').addEventListener('click', e => {
        const b = e.target.closest('[data-gedit]');
        if (b) { G.editing = Number(b.dataset.gedit); TC.render(true); U.$('#g-first').focus(); }
        if (e.target.closest('#gCancel')) { G.editing = null; TC.render(true); }
      });
      f.addEventListener('submit', async e => {
        e.preventDefault();
        const first = U.$('#g-first').value.trim(), langs = U.$$('input[name=g-lang]:checked').map(x => x.value);
        U.$('#e-g-first').textContent = first ? '' : t('e_gd_name'); U.$('#e-g-langs').textContent = langs.length ? '' : t('e_gd_langs');
        if (!first) { U.$('#g-first').focus(); return; } if (!langs.length) return;
        try {
          await TC.api.saveGuide(G.editing, { first_name: first, last_name: U.$('#g-last').value.trim() || null, languages: langs, is_active: U.$('#g-active').checked });
          G.editing = null; U.toast(t('saved')); await TC.views.guides.load(); TC.render(true);
        } catch (err) { U.$('#e-g-form').textContent = t('save_err', { msg: U.errMsg(err) }); }
      });
    }
  };
})(window.TC);
