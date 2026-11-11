# Release image package refresh

Release-images run 42984611189 failed before publishing a complete signed image manifest:

- Backup: Alpine 3.23 no longer supplied the pinned rsync, OpenSSH client and tzdata revisions. Updated to rsync 3.5.2-r1, OpenSSH client 10.2_p1-r1 and tzdata 2026f-r0. The runtime checks, image smoke test and image label use the same versions.
- Deployment agent: its digest-pinned Alpine 3.24 base contained vulnerable musl/musl-utils 1.2.6-r2 and zlib 1.3.2-r0. Both stages explicitly install musl/musl-utils 1.2.6-r3 and zlib 1.4-r0, the available patched repository versions.

The backup image also needed the patched Alpine 3.23 musl/musl-utils 1.2.5-r24 and zlib 1.4-r0; its first successful build exposed the same vulnerabilities during scanning. These packages are pinned and checked at runtime too.

No scanner exceptions, signing requirements or deployment gates were changed. This requires a new release from the corrected source; rerunning the old immutable tag alone would repeat the failure.

Validation: build both Dockerfiles, run docker/backup/image-smoke.test.sh against the backup image, scan both images using Trivy 0.70.0 with HIGH/CRITICAL, ignore-unfixed and vuln/secret scanners, and run pnpm test:workflows. The release pipeline remains the authority for image signing and deployment.
