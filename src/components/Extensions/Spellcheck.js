import { Extension } from '@tiptap/core'
import { Decoration, DecorationSet } from 'prosemirror-view'
import Typo from 'typo-js'

let typo = null

export const Spellcheck = Extension.create({
  name: 'spellcheck',

  addOptions() {
    return {
      lang: 'en_US',
    }
  },

  onCreate() {
    fetch('/dictionaries/en_US.aff')
      .then((aff) => aff.text())
      .then((affData) => {
        fetch('/dictionaries/en_US.dic')
          .then((dic) => dic.text())
          .then((dicData) => {
            typo = new Typo('en_US', affData, dicData, { platform: 'any' })
            this.editor.commands.setContent(this.editor.getHTML()) // trigger rerender
          })
      })
  },

  addProseMirrorPlugins() {
    return [
      new this.editor.view.Plugin({
        props: {
          decorations: (state) => {
            const decorations = []
            const textNodes = []

            state.doc.descendants((node, pos) => {
              if (node.isText) {
                textNodes.push({ node, pos })
              }
            })

            for (const { node, pos } of textNodes) {
              const words = node.text.split(/\s+/)
              let offset = 0

              for (const word of words) {
                if (!word) {
                  offset += 1
                  continue
                }

                const isValid = typo?.check(word.replace(/[^\w']/g, '')) // strip punctuation
                if (typo && !isValid) {
                  decorations.push(
                    Decoration.inline(
                      pos + offset,
                      pos + offset + word.length,
                      { class: 'misspelled' }
                    )
                  )
                }

                offset += word.length + 1
              }
            }

            return DecorationSet.create(state.doc, decorations)
          },
        },
      }),
    ]
  },
})
