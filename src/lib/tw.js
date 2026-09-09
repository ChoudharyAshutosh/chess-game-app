import {create} from 'twrnc';

// Single shared twrnc instance, built from the project's tailwind.config.js so
// custom theme values (e.g. `bg-chess-light`) are available everywhere.
const tw = create(require('../../tailwind.config'));

export default tw;
