// An explicit publication snapshot, never part of an ordinary build or push.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const allowedOrigins=['https://github.com/eo777/voynich-analysis.git','git@github.com:eo777/voynich-analysis.git'];
const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
export function inspectSnapshot(cwd,{origins=allowedOrigins}={}){
  if(git(cwd,'rev-parse','--is-bare-repository')!=='false')throw new Error('Use a working checkout.');
  if(path.resolve(git(cwd,'rev-parse','--show-toplevel'))!==path.resolve(cwd))throw new Error('Run from the repository root.');
  if(git(cwd,'symbolic-ref','--short','HEAD')!=='main')throw new Error('Switch to main first.');
  if(git(cwd,'status','--porcelain','--untracked-files=all'))throw new Error('Commit the reviewed changes locally first; the working tree must be clean.');
  const origin=git(cwd,'remote','get-url','origin'),pushOrigin=git(cwd,'remote','get-url','--push','origin');
  if(!origins.includes(origin)||pushOrigin!==origin)throw new Error('Unexpected origin or separate push URL; refusing to rewrite another repository.');
  const local=git(cwd,'for-each-ref','--format=%(refname)','refs/heads','refs/tags').split('\n');
  if(local.length!==1||local[0]!=='refs/heads/main')throw new Error('Other local branches or tags retain history. Resolve them explicitly before squashing.');
  const refs=git(cwd,'ls-remote','--heads','--tags','origin').split('\n').map(x=>x.split(/\s+/));
  if(refs.length!==1||refs[0][1]!=='refs/heads/main')throw new Error('Remote must have only main and no tags. Other history is not automatically deleted.');
  const remote=refs[0][0],head=git(cwd,'rev-parse','HEAD'),tree=git(cwd,'rev-parse','HEAD^{tree}');
  try{git(cwd,'merge-base','--is-ancestor',remote,head);}catch{throw new Error('Remote main is not an ancestor of this checkout. Fetch and review its changes first.');}
  return {origin,head,tree,remote,commits:Number(git(cwd,'rev-list','--count','HEAD'))};
}
export function applySnapshot(cwd,reviewed,options={}){
  const fresh=inspectSnapshot(cwd,options);
  if(JSON.stringify(fresh)!==JSON.stringify(reviewed))throw new Error('Repository changed after inspection. Inspect the new state before applying.');
  const snapshot=git(cwd,'commit-tree',fresh.tree,'-m','Publish current analysis snapshot');
  // A stale remote update fails atomically; never use an unconditional force push.
  git(cwd,'push',`--force-with-lease=refs/heads/main:${fresh.remote}`,'origin',`${snapshot}:refs/heads/main`);
  try{git(cwd,'update-ref','refs/heads/main',snapshot,fresh.head);}catch{
    throw new Error(`Remote published ${snapshot}, but local main changed concurrently. Re-clone before publishing again.`);
  }
  return snapshot;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  try{
    const args=process.argv.slice(2);
    if(args.some(x=>x!=='--apply'))throw new Error('Usage: npm run publish:squash -- [--apply]');
    const cwd=process.cwd(),reviewed=inspectSnapshot(cwd);
    console.log(`Repository: ${reviewed.origin}\nReplace ${reviewed.commits} main commit(s) with one root snapshot of the same files.\nThis resets history for the WHOLE blog, not just one article.\nOld clones, reflogs, GitHub caches, PR refs and Actions artifacts are not erased by this command.`);
    if(!args.includes('--apply'))console.log('Preview only. To validate and publish this snapshot: npm run publish:squash -- --apply');
    else{
      const run=args=>execFileSync(process.execPath,args,{cwd,stdio:'inherit'});
      run(['--test',...fs.readdirSync(path.join(cwd,'tests')).filter(x=>x.endsWith('.test.mjs')).map(x=>'tests/'+x)]);
      run(['tools/build.mjs']);run(['tools/check.mjs']);
      console.log(`Published snapshot ${applySnapshot(cwd,reviewed)}. Existing clones must re-clone or carefully reset; do not merge the old history.`);
    }
  }catch(error){console.error(error.message);process.exitCode=1;}
}
