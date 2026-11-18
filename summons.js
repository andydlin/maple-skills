"use strict";
const Summons = (() => {
  let indexPromise;
  const cache = new Map();
  async function index() {
    if (!indexPromise) indexPromise = fetch('data/summons/index.json').then(r => {
      if (!r.ok) throw Error('Summon index unavailable');
      return r.json();
    }).catch(error => { indexPromise = null; throw error; });
    return indexPromise;
  }
  async function attach(data, classSlug) {
    try {
      const entries = (await index()).entries.filter(e => e.class === classSlug);
      const byId = new Map(entries.map(e => [String(e.skillId), e]));
      return {...data, skills:data.skills.map(s => ({...s, _summon:byId.get(String(s.id)) || null}))};
    } catch { return data; }
  }
  async function get(classSlug, id) {
    const key = `${classSlug}/${id}`;
    if (!/^[a-z0-9-]+\/\d+$/.test(key)) throw Error('Invalid summon identity');
    if (!cache.has(key)) cache.set(key, fetch(`data/summons/${key}.json`).then(r => {
      if (!r.ok) throw Error('Summon animations could not load. Try again.');
      return r.json();
    }).catch(error => {cache.delete(key); throw error;}));
    return cache.get(key);
  }
  function label(name) {
    return name === 'source-sequence' || name === 'unnamed' ? 'Source sequence' : name.replace(/([a-z])(\d)/g, '$1 $2').replace(/^./, c => c.toUpperCase());
  }
  return {attach, get, label};
})();
