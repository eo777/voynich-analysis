import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {inspectSnapshot,applySnapshot} from '../tools/squash-history.mjs';

test('snapshot preserves files, drops ancestry, and refuses unsafe publication states',()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'blog-history-test-'));
 const cwd=path.join(temp,'checkout'),remote=path.join(temp,'remote.git');fs.mkdirSync(cwd);
 const git=(dir,...args)=>execFileSync('git',args,{cwd:dir,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 const options={origins:[remote]};
 try{
  git(temp,'init','--bare',remote);git(cwd,'init','-b','main');
  git(cwd,'config','user.name','Test');git(cwd,'config','user.email','test@example.invalid');git(cwd,'config','commit.gpgsign','false');
  fs.writeFileSync(path.join(cwd,'article.md'),'Initial text');git(cwd,'add','article.md');git(cwd,'commit','-m','Initial');
  git(cwd,'remote','add','origin',remote);git(cwd,'push','-u','origin','main');
  const initial=inspectSnapshot(cwd,options);assert.equal(git(cwd,'rev-list','--count','HEAD'),'1');
  assert.throws(()=>inspectSnapshot(cwd),/Unexpected origin/);
  fs.writeFileSync(path.join(cwd,'article.md'),'Reviewed text');assert.throws(()=>inspectSnapshot(cwd,options),/clean/);
  git(cwd,'add','article.md');git(cwd,'commit','-m','Correction');
  assert.throws(()=>applySnapshot(cwd,initial,options),/changed after inspection/);
  git(cwd,'tag','retained');assert.throws(()=>inspectSnapshot(cwd,options),/branches or tags/);git(cwd,'tag','-d','retained');
  git(cwd,'push','origin','HEAD:refs/heads/other');assert.throws(()=>inspectSnapshot(cwd,options),/Remote must/);git(cwd,'push','origin','--delete','other');
  const plan=inspectSnapshot(cwd,options),root=applySnapshot(cwd,plan,options);
  assert.equal(git(cwd,'rev-list','--count','HEAD'),'1');assert.equal(git(cwd,'rev-parse','HEAD^{tree}'),plan.tree);
  assert.equal(git(remote,'rev-parse','main'),root);assert.equal(git(cwd,'status','--porcelain'),'');
  // Simulate a collaborator's publication after preview.
  const fresh=inspectSnapshot(cwd,options),other=git(cwd,'commit-tree',plan.tree,'-p',root,'-m','Other author');
  git(cwd,'push','origin',`${other}:main`);
  assert.throws(()=>applySnapshot(cwd,fresh,options),/Remote main is not an ancestor/);
  assert.equal(git(remote,'rev-parse','main'),other);
 }finally{
  if(path.dirname(temp)!==path.resolve(os.tmpdir())||!path.basename(temp).startsWith('blog-history-test-'))throw new Error('Unsafe cleanup');
  fs.rmSync(temp,{recursive:true,force:true});
 }
});
