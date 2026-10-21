import tailwindcss from '@tailwindcss/postcss'
import autoprefixer from 'autoprefixer'
import cascadeLayers from '@csstools/postcss-cascade-layers'
import isPseudoClass from '@csstools/postcss-is-pseudo-class'
import oklabFunction from '@csstools/postcss-oklab-function'
import selectorParser from 'postcss-selector-parser'

// Téléphones au navigateur ancien (ex. Samsung A11 pas à jour) : sans ces étapes,
// tout le design est ignoré (le site s'affiche sans couleurs ni mise en page).
// - :where() (Chrome 88) devient :is(), puis :is() est déplié en sélecteurs simples
// - les couches @layer (Chrome 99) sont aplaties : chaque couche reçoit un renfort
//   de priorité (:not(#\#) répété) qui garde l'ordre d'origine
const whereEnIs = {
  postcssPlugin: 'moftal-where-en-is',
  Rule(rule) {
    if (rule.selector.includes(':where(')) rule.selector = rule.selector.replace(/:where\(/g, ':is(')
  },
}

// Valeurs par défaut de Tailwind (bordure pleine, ombres, déplacements…) : Tailwind
// ne les donne aux navigateurs sans @property que derrière un test @supports que les
// navigateurs anciens ne passent pas toujours. On les applique toujours : même
// résultat pour les navigateurs récents (mêmes valeurs que leurs @property).
const valeursParDefautToujours = {
  postcssPlugin: 'moftal-valeurs-par-defaut',
  AtRule: {
    supports(atRule) {
      if (atRule.params.includes('margin-trim:inline') || atRule.params.includes('margin-trim: inline')) atRule.replaceWith(atRule.nodes)
    },
  },
}

// inset (Chrome 87) : on ajoute avant lui top/right/bottom/left, compris partout
const insetEnCotes = {
  postcssPlugin: 'moftal-inset',
  Declaration: {
    inset(decl) {
      const v = decl.value.trim().split(/\s+(?![^(]*\))/)
      if (!v.length || v.length > 4) return
      const [t, r = t, b = t, l = r] = v
      for (const [prop, val] of [['top', t], ['right', r], ['bottom', b], ['left', l]]) decl.cloneBefore({ prop, value: val })
    },
  },
}

// Hauteur de l'écran en dvh/svh/lvh (Chrome 108) : sans secours, la page ne
// remplit plus l'écran et le pied de page remonte. On ajoute avant la même valeur
// en vh, comprise partout (les navigateurs récents gardent la valeur dvh).
const unitesEcranEnVh = {
  postcssPlugin: 'moftal-dvh-en-vh',
  Declaration(decl) {
    if (!/\d(dvh|svh|lvh)\b/.test(decl.value)) return
    const secours = decl.value.replace(/(\d)(dvh|svh|lvh)\b/g, '$1vh')
    const avant = decl.prev()
    if (avant?.type === 'decl' && avant.prop === decl.prop && avant.value === secours) return
    decl.cloneBefore({ value: secours })
  },
}

// Les règles écrites hors Tailwind (globals.css, CSS des composants, bibliothèques)
// n'ont pas de couche : elles passaient avant toutes les couches. On leur donne le
// renfort le plus fort, celui que reçoivent les règles sans couche de index.css.
const RENFORT_SANS_COUCHE = 10
const PSEUDO_ELEMENTS = /^::|^:(before|after|first-line|first-letter)$/i
const renforcer = selectorParser((selecteurs) => {
  selecteurs.each((selecteur) => {
    // Dernier élément visé : avant son éventuel pseudo-élément (::before…)
    let position = selecteur.nodes.length
    for (let k = selecteur.nodes.length - 1; k >= 0; k--) {
      const n = selecteur.nodes[k]
      if (n.type === 'combinator') break
      if (n.type === 'pseudo' && PSEUDO_ELEMENTS.test(n.value)) position = k
    }
    const avant = selecteur.nodes[position]
    for (let k = 0; k < RENFORT_SANS_COUCHE; k++) {
      const renfort = selectorParser.pseudo({ value: ':not(#\\#)' })
      if (avant) selecteur.insertBefore(avant, renfort)
      else selecteur.append(renfort)
    }
  })
})
const reglesSansCouche = {
  postcssPlugin: 'moftal-regles-sans-couche',
  Once(root) {
    const fichier = root.source?.input?.file || ''
    if (/[\\/]src[\\/]index\.css$/.test(fichier)) return // traité par cascadeLayers
    root.walkRules((rule) => {
      const parent = rule.parent
      if (parent?.type === 'atrule' && /keyframes$/i.test(parent.name)) return
      rule.selector = renforcer.processSync(rule.selector)
    })
  },
}

export default {
  plugins: [
    tailwindcss(),
    whereEnIs,
    cascadeLayers(),
    isPseudoClass({ preserve: false, onComplexSelector: 'warning' }),
    valeursParDefautToujours,
    insetEnCotes,
    unitesEcranEnVh,
    // Couleurs oklch() (Chrome 111) : une couleur RGB de secours est ajoutée avant
    oklabFunction({ preserve: true }),
    reglesSansCouche,
    autoprefixer(),
  ],
}
