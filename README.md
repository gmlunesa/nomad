# nomad

This is a clone of the Google Chrome dinosaur game clone, developed by [Chromium](https://cs.chromium.org/chromium/src/components/neterror/resources/offline.js?q=t-rex+package:%5Echromium$&dr=C&l=7).

### Gameplay

The main character is a nomad in the desert, looking for a new home. He must dodge rocks and birds in order to survive. This game is infinite, and the speed gets faster exponentially. The stones and birds will be randomly generated.

**Moves**:

* Spacebar/UP arrow: START/JUMP
* DOWN arrow: DUCK

### How Automaton is Applied


![](http://i.imgur.com/56FFIIE.png "Logo Title Text 1")

There will be four states present, represented as the walking state, the jumping state, the up-in-the-air state, and then the dead state. The user input will affect the nomad’s next state.


### System Requirements

This will run on Google Chrome, with JavaScript enabled. Please open `index.html` to get started.
