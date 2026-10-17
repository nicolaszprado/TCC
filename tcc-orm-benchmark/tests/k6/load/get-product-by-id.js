import { suite } from '../lib/suite.js';

const test = suite('get-product-by-id', 'load');
export const options = test.options;
export const setup = test.setup;
export const handleSummary = test.handleSummary;
export default test.run;
