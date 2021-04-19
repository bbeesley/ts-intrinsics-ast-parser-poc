import {
  createProgram,
  createParser,
  SchemaGenerator,
  createFormatter,
} from 'ts-json-schema-generator';
import { resolve } from 'path';

import { LowercaseParser } from './lowercase-parser';

const config = {
  path: resolve('src', 'types', 'all-types.ts'),
  tsconfig: 'tsconfig-types.json',
  type: '*', // Or <type-name> if you want to generate schema for that one type only
};

const program = createProgram(config);

// We configure the parser an add our custom parser to it.
const parser = createParser(program, config, (prs) => {
  prs.addNodeParser(new LowercaseParser());
});

const formatter = createFormatter(config);
const generator = new SchemaGenerator(program, parser, formatter, config);
const schema = generator.createSchema(config.type);

const schemaString = JSON.stringify(schema, null, 2);

console.log(schemaString);
