begin;
select public.test_assert(not exists(select 1 from storage.buckets where id='task-files'),'missing optional bucket is supported');
select public.test_assert(not exists(select 1 from pg_policies where schemaname='storage' and policyname='taskfiles_rw'),'legacy broad policy removed');
select public.test_assert((select count(*)=2 from eflow_evidence.objects where legacy),'legacy references, including missing file, sealed');

set role authenticated;
select set_config('request.jwt.claim.role','authenticated',false);
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',false);
select public.test_assert((select public.resolve_subtask_reviewer(t,'10000000-0000-4000-8000-000000000002')='10000000-0000-4000-8000-000000000001' from public.tasks t where t.id='20000000-0000-4000-8000-000000000001'),'effective assigned lead wins');
select public.test_assert((select public.resolve_subtask_reviewer(t,'10000000-0000-4000-8000-000000000001')='10000000-0000-4000-8000-000000000003' from public.tasks t where t.id='20000000-0000-4000-8000-000000000001'),'leader self-review routes to reviewer, not stale lead');
select public.test_throws($q$select public.save_subtask_progress('30000000-0000-4000-8000-000000000002',20)$q$,'not assigned');
select public.test_throws($q$select public.submit_task_for_review('20000000-0000-4000-8000-000000000004','{"note":"Unassigned parent"}')$q$,'effective Task Leader');
select public.test_assert((select count(*)=1 from storage.objects),'participant reads legacy evidence');
select public.test_throws($q$insert into storage.objects(bucket_id,name,owner_id) values ('task-attachments','malformed','10000000-0000-4000-8000-000000000002')$q$,'row-level security');
select public.test_throws($q$insert into storage.objects(bucket_id,name,owner_id) values ('task-attachments','subtasks/30000000-0000-4000-8000-000000000001/progress/spoof.pdf','10000000-0000-4000-8000-000000000001')$q$,'row-level security');

insert into storage.objects(bucket_id,name,owner_id,metadata)
select 'task-attachments','subtasks/30000000-0000-4000-8000-000000000001/progress/'||file,
  '10000000-0000-4000-8000-000000000002',jsonb_build_object('size',20,'mimetype','application/pdf')
from unnest(array['progress.pdf','cleanup.pdf','cleanup-race.pdf','duplicate.pdf']) as file;
select public.save_subtask_progress('30000000-0000-4000-8000-000000000001',20,p_attachment_path=>'subtasks/30000000-0000-4000-8000-000000000001/progress/progress.pdf',p_attachment_name=>'progress.pdf');
select public.test_throws($q$select public.save_subtask_progress('30000000-0000-4000-8000-000000000001',30,p_attachment_path=>'subtasks/30000000-0000-4000-8000-000000000001/progress/progress.pdf')$q$,'already finalized');
select public.test_throws($q$select public.save_subtask_progress('30000000-0000-4000-8000-000000000001',30,p_attachment_path=>'subtasks/30000000-0000-4000-8000-000000000001/progress/missing.pdf')$q$,'missing or was not uploaded');
select public.test_assert((select percent_complete=20 from public.subtasks where id='30000000-0000-4000-8000-000000000001'),'failed RPC rolls back progress');

-- Direct deletion without a durable claim is denied, even for the uploader.
with removed as (delete from storage.objects where name like '%/cleanup.pdf' returning *) select public.test_assert((select count(*)=0 from removed),'delete requires claim');
select public.claim_task_evidence_cleanup('subtasks/30000000-0000-4000-8000-000000000001/progress/cleanup.pdf');
with removed as (delete from storage.objects where name like '%/cleanup.pdf' returning *) select public.test_assert((select count(*)=1 from removed),'claimed temp upload can be deleted');
select public.test_throws($q$insert into storage.objects(bucket_id,name,owner_id,metadata) values ('task-attachments','subtasks/30000000-0000-4000-8000-000000000001/progress/cleanup.pdf','10000000-0000-4000-8000-000000000002','{"size":20,"mimetype":"application/pdf"}')$q$,'row-level security');
select public.claim_task_evidence_cleanup('subtasks/30000000-0000-4000-8000-000000000001/progress/cleanup-race.pdf');
select public.test_throws($q$select public.save_subtask_progress('30000000-0000-4000-8000-000000000001',30,p_attachment_path=>'subtasks/30000000-0000-4000-8000-000000000001/progress/cleanup-race.pdf')$q$,'claimed for cleanup');
select public.test_throws($q$select public.claim_task_evidence_cleanup('subtasks/30000000-0000-4000-8000-000000000001/progress/progress.pdf')$q$,'Finalized evidence');
with changed as (update storage.objects set metadata='{}' where name like '%/progress.pdf' returning *) select public.test_assert((select count(*)=0 from changed),'no overwrite');
select public.test_throws($q$delete from public.subtask_progress_updates where attachment_path like '%/progress.pdf'$q$,'immutable');

-- Unrelated, inactive, missing-profile, and anonymous users fail closed.
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000004',false);
select public.test_assert((select count(*)=0 from storage.objects),'unrelated cannot read files');
select public.test_throws($q$select public.claim_task_evidence_cleanup('subtasks/30000000-0000-4000-8000-000000000001/progress/duplicate.pdf')$q$,'Only the uploader');
select public.test_throws($q$select public.save_subtask_progress('30000000-0000-4000-8000-000000000001',40)$q$,'not assigned');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000006',false);
select public.test_assert((select count(*)=0 from storage.objects),'inactive cannot read');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000099',false);
select public.test_assert((select count(*)=0 from storage.objects),'missing profile cannot read');
reset role;
set role anon;
select set_config('request.jwt.claim.sub','',false);
select set_config('request.jwt.claim.role','anon',false);
select public.test_assert((select count(*)=0 from storage.objects),'anonymous cannot read');
reset role;
set role authenticated;
select set_config('request.jwt.claim.role','authenticated',false);
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000002',false);

-- Bad MIME/size, foreign-task path, and other uploader must be rejected.
insert into storage.objects(bucket_id,name,owner_id,metadata) values
 ('task-attachments','subtasks/30000000-0000-4000-8000-000000000001/progress/bad.html','10000000-0000-4000-8000-000000000002','{"size":20,"mimetype":"text/html"}'),
 ('task-attachments','subtasks/30000000-0000-4000-8000-000000000001/progress/huge.pdf','10000000-0000-4000-8000-000000000002','{"size":52428801,"mimetype":"application/pdf"}');
select public.test_throws($q$select public.save_subtask_progress('30000000-0000-4000-8000-000000000001',30,p_attachment_path=>'subtasks/30000000-0000-4000-8000-000000000001/progress/bad.html')$q$,'Unsupported evidence MIME');
select public.test_throws($q$select public.save_subtask_progress('30000000-0000-4000-8000-000000000001',30,p_attachment_path=>'subtasks/30000000-0000-4000-8000-000000000001/progress/huge.pdf')$q$,'50 MiB');
select public.test_throws($q$select public.save_subtask_progress('30000000-0000-4000-8000-000000000001',30,p_attachment_path=>'20000000-0000-4000-8000-000000000003/40000000-0000-4000-8000-000000000001/foreign.pdf')$q$,'does not belong');
reset role;
insert into storage.objects(bucket_id,name,owner_id,metadata) values
 ('task-attachments','subtasks/30000000-0000-4000-8000-000000000001/progress/other-owner.pdf','10000000-0000-4000-8000-000000000001','{"size":20,"mimetype":"application/pdf"}');
set role authenticated;
select public.test_throws($q$select public.save_subtask_progress('30000000-0000-4000-8000-000000000001',30,p_attachment_path=>'subtasks/30000000-0000-4000-8000-000000000001/progress/other-owner.pdf')$q$,'was not uploaded by you');

insert into storage.objects(bucket_id,name,owner_id,metadata)
select 'task-attachments','subtasks/30000000-0000-4000-8000-000000000001/40000000-0000-4000-8000-000000000001/'||n||'.pdf',
 '10000000-0000-4000-8000-000000000002','{"size":20,"mimetype":"application/pdf"}' from generate_series(1,11) n;
select public.test_throws($q$select public.submit_subtask_for_review('30000000-0000-4000-8000-000000000001', jsonb_build_object('id','40000000-0000-4000-8000-000000000001','note','Too many','attachments',(select jsonb_agg(jsonb_build_object('fileName',n||'.pdf','filePath','subtasks/30000000-0000-4000-8000-000000000001/40000000-0000-4000-8000-000000000001/'||n||'.pdf','fileSize',20,'mimeType','application/pdf')) from generate_series(1,11) n)))$q$,'At most 10');
select public.test_assert((select count(*)=0 from public.subtask_submissions),'too many attachments rolls back whole submission');
select public.submit_subtask_for_review('30000000-0000-4000-8000-000000000001',jsonb_build_object('id','40000000-0000-4000-8000-000000000001','note','Done','attachments',jsonb_build_array(jsonb_build_object('fileName','1.pdf','filePath','subtasks/30000000-0000-4000-8000-000000000001/40000000-0000-4000-8000-000000000001/1.pdf','fileSize',999,'mimeType','fake/type'))));
select public.test_assert((select file_size=20 and mime_type='application/pdf' from public.subtask_submission_attachments),'stored size and MIME come from Storage');
select public.test_assert((select count(*)=1 from public.notifications where user_id='10000000-0000-4000-8000-000000000001' and type='approval_needed'),'existing RPC notifies effective lead');
select public.test_assert((select count(*)=1 from public.audit_events where action='subtask.submitted'),'existing audit is preserved');
select public.test_throws($q$update public.subtask_submission_attachments set file_path='forged' $q$,'immutable');
select public.test_throws($q$select public.claim_task_evidence_cleanup('subtasks/30000000-0000-4000-8000-000000000001/40000000-0000-4000-8000-000000000001/1.pdf')$q$,'Finalized evidence');
select public.test_throws($q$select public.submit_subtask_for_review('30000000-0000-4000-8000-000000000001','{"id":"40000000-0000-4000-8000-000000000001","note":"Duplicate","attachments":[{}]}')$q$,'already under review');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000003',false);
select public.test_assert((select count(*)>0 from storage.objects where name like '%/1.pdf'),'reviewer reads submitted file');

-- Parent submission uses its assigned lead, not a stale planning lead.
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000005',false);
select public.test_throws($q$select public.submit_task_for_review('20000000-0000-4000-8000-000000000001','{"note":"Stale lead"}')$q$,'effective Task Leader');
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false);
select public.test_throws($q$select public.submit_task_for_review('20000000-0000-4000-8000-000000000001','{"note":"Unapproved work"}')$q$,'all subtasks approved');
insert into storage.objects(bucket_id,name,owner_id,metadata) values
 ('task-attachments','20000000-0000-4000-8000-000000000002/40000000-0000-4000-8000-000000000002/parent.pdf','10000000-0000-4000-8000-000000000001','{"size":25,"mimetype":"application/pdf"}');
select public.submit_task_for_review('20000000-0000-4000-8000-000000000002','{"id":"40000000-0000-4000-8000-000000000002","note":"Parent complete","attachments":[{"fileName":"parent.pdf","filePath":"20000000-0000-4000-8000-000000000002/40000000-0000-4000-8000-000000000002/parent.pdf","fileSize":999,"mimeType":"fake/type"}]}');
select public.test_assert((select status='for_review' from public.tasks where id='20000000-0000-4000-8000-000000000002'),'parent RPC still completes');
select public.test_assert((select latest_submission #>> '{attachments,0,fileSize}'='25' and latest_submission #>> '{attachments,0,mimeType}'='application/pdf' from public.tasks where id='20000000-0000-4000-8000-000000000002'),'parent snapshot uses validated metadata');
select public.test_throws($q$delete from public.task_attachments where file_name='parent.pdf'$q$,'immutable');

-- No changes to unrelated buckets.
insert into storage.objects(bucket_id,name,owner_id) values ('unrelated-bucket','unchanged','10000000-0000-4000-8000-000000000001');
with changed as (update storage.objects set name='still-works' where bucket_id='unrelated-bucket' returning *) select public.test_assert((select count(*)=1 from changed),'other-bucket update unaffected');
set constraints all immediate;
rollback;
