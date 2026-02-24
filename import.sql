--
-- PostgreSQL database dump
--

\restrict zswCGFXdWUWDSkd6d4aZtagdOakSYOEFT6Cc6uz2EW9iwU1jewhJ4JLgLf6BAgN

-- Dumped from database version 18.0
-- Dumped by pg_dump version 18.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: Ballot; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Ballot" (id, "debateId", "adjudicatorId", status, vote, "propTotal", "oppTotal", "privateNotes", "submittedAt", "createdAt", "updatedAt") FROM stdin;
cmlxv2p1p00amc4cwb8gmjmgc	cmlxv2p1g00akc4cwjdsphe1a	cmlxv2p1i00alc4cwcajz9c48	SUBMITTED	PROPOSITION	245.5	235.5	\N	2026-02-22 16:54:41.428	2026-02-22 14:46:56.844	2026-02-22 16:54:41.431
cmlxv2p2000axc4cwuiqho0mq	cmlxv2p1t00avc4cw1c41dqlr	cmlxv2p1t00awc4cwp5iyyg85	SUBMITTED	PROPOSITION	238.5	237.5	\N	2026-02-22 17:00:03.546	2026-02-22 14:46:56.856	2026-02-22 17:00:03.546
cmlxv2p1c00abc4cw1p0yn39r	cmlxv2p0y009zc4cwbl91sgc9	cmlxv2p0z00a1c4cwt91twyln	SUBMITTED	OPPOSITION	232.0	233.0	\N	2026-02-22 17:12:24.462	2026-02-22 14:46:56.832	2026-02-22 17:12:24.463
cmlxv2p1600a2c4cw0qqmu9n6	cmlxv2p0y009zc4cwbl91sgc9	cmlxv2p0z00a0c4cwlj2uyaav	SUBMITTED	OPPOSITION	228.5	236.5	\N	2026-02-22 17:12:26.35	2026-02-22 14:46:56.826	2026-02-22 17:12:26.351
cmlxv2p0t009qc4cwhuu9w5cs	cmlxv2p0h009oc4cw0m618bg5	cmlxv2p0o009pc4cwy6a1nywd	SUBMITTED	OPPOSITION	247.0	248.0	\N	2026-02-22 17:30:08.217	2026-02-22 14:46:56.813	2026-02-22 17:30:08.217
\.


--
-- Data for Name: BallotSpeech; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."BallotSpeech" (id, "ballotId", role, side, "speakerId", "speakerName", score, comment, "createdAt", "updatedAt") FROM stdin;
cmlxv2p0u009rc4cwkdgmo6ov	cmlxv2p0t009qc4cwhuu9w5cs	PROP_1	PROPOSITION	cmlxufsfz002cc4cw8z9l9m1r	Мони	71.0	\N	2026-02-22 14:46:56.813	2026-02-22 17:30:08.219
cmlxv2p0u009sc4cwhqbh0owa	cmlxv2p0t009qc4cwhuu9w5cs	OPP_1	OPPOSITION	cmlxug5rl002kc4cwcf35llai	Георги	71.0	\N	2026-02-22 14:46:56.813	2026-02-22 17:30:08.222
cmlxv2p0u009tc4cwrwz67tx9	cmlxv2p0t009qc4cwhuu9w5cs	PROP_2	PROPOSITION	cmlxufsfs002ac4cwvrekeqpp	Алекс	71.0	\N	2026-02-22 14:46:56.813	2026-02-22 17:30:08.223
cmlxv2p0u009uc4cwb896dpoy	cmlxv2p0t009qc4cwhuu9w5cs	OPP_2	OPPOSITION	cmlxug5r9002gc4cwprblwzs8	Кари	71.0	\N	2026-02-22 14:46:56.813	2026-02-22 17:30:08.224
cmlxv2p0u009vc4cw31iw4n8i	cmlxv2p0t009qc4cwhuu9w5cs	PROP_3	PROPOSITION	cmlxufsg4002ec4cwle0ss7yj	Калоян	70.0	\N	2026-02-22 14:46:56.813	2026-02-22 17:30:08.224
cmlxv2p0u009wc4cwp961r8n4	cmlxv2p0t009qc4cwhuu9w5cs	OPP_3	OPPOSITION	cmlxug5rg002ic4cwaoc4wcc8	Михаел	72.0	\N	2026-02-22 14:46:56.813	2026-02-22 17:30:08.225
cmlxv2p0v009xc4cwhbk6g26n	cmlxv2p0t009qc4cwhuu9w5cs	OPP_REPLY	OPPOSITION	cmlxug5rl002kc4cwcf35llai	Георги	34.0	\N	2026-02-22 14:46:56.813	2026-02-22 17:30:08.226
cmlxv2p0v009yc4cwoe5mleq9	cmlxv2p0t009qc4cwhuu9w5cs	PROP_REPLY	PROPOSITION	cmlxufsfs002ac4cwvrekeqpp	Алекс	35.0	\N	2026-02-22 14:46:56.813	2026-02-22 17:30:08.226
cmlxv2p1p00anc4cwp7pn5mhi	cmlxv2p1p00amc4cwb8gmjmgc	PROP_1	PROPOSITION	cmlxuhinh0032c4cw8wl8zgiz	Иван	72.0	needs to work on framing and characterization and also stakeholders 	2026-02-22 14:46:56.844	2026-02-22 16:54:41.434
cmlxv2p1q00aoc4cww9r2c4xe	cmlxv2p1p00amc4cwb8gmjmgc	OPP_1	OPPOSITION	cmlxuhs9y0034c4cwsocop6z5	Васил	70.0	needs to work on strategy 	2026-02-22 14:46:56.844	2026-02-22 16:54:41.438
cmlxv2p1q00apc4cwhxbjgw9v	cmlxv2p1p00amc4cwb8gmjmgc	PROP_2	PROPOSITION	cmlxuhin7002yc4cwkq72ony7	Деница	70.0	needs to work on strategy 	2026-02-22 14:46:56.844	2026-02-22 16:54:41.439
cmlxv2p1q00aqc4cwvrp96887	cmlxv2p1p00amc4cwb8gmjmgc	OPP_2	OPPOSITION	cmlxuhsa50036c4cwxinqz7mk	Ангел	66.0	needs to work on strategy  and rebuttal	2026-02-22 14:46:56.844	2026-02-22 16:54:41.44
cmlxv2p1q00arc4cwiyhwu7ju	cmlxv2p1p00amc4cwb8gmjmgc	PROP_3	PROPOSITION	cmlxuhinc0030c4cwedpzxo4a	Аракси	69.5	needs to work on strategy 	2026-02-22 14:46:56.844	2026-02-22 16:54:41.441
cmlxv2p1q00asc4cwd7k3lnu0	cmlxv2p1p00amc4cwb8gmjmgc	OPP_3	OPPOSITION	cmlxuhsaa0038c4cwnrq1oked	Симеон	67.0	\N	2026-02-22 14:46:56.844	2026-02-22 16:54:41.441
cmlxv2p1d00acc4cwvyd51w8o	cmlxv2p1c00abc4cw1p0yn39r	PROP_1	PROPOSITION	cmlxugklo002mc4cwqscogg8i	Елица	63.0	\N	2026-02-22 14:46:56.832	2026-02-22 17:12:24.464
cmlxv2p1d00adc4cwklo9zitq	cmlxv2p1c00abc4cw1p0yn39r	OPP_1	OPPOSITION	cmlxuh5eh002sc4cwnnw1k008	Яна С.	65.5	\N	2026-02-22 14:46:56.832	2026-02-22 17:12:24.468
cmlxv2p1d00aec4cwj89i5fem	cmlxv2p1c00abc4cw1p0yn39r	PROP_2	PROPOSITION	cmlxugkm1002qc4cwdvqxcvjd	Кристалина	72.0	\N	2026-02-22 14:46:56.832	2026-02-22 17:12:24.469
cmlxv2p1d00afc4cw7fl6e3r8	cmlxv2p1c00abc4cw1p0yn39r	OPP_2	OPPOSITION	cmlxuh5eo002uc4cwnqqwq7e7	Яна Т.	66.0	\N	2026-02-22 14:46:56.832	2026-02-22 17:12:24.469
cmlxv2p1d00agc4cwqbwlmgpj	cmlxv2p1c00abc4cw1p0yn39r	PROP_3	PROPOSITION	cmlxugklw002oc4cw3fr608er	Иван	61.5	\N	2026-02-22 14:46:56.832	2026-02-22 17:12:24.47
cmlxv2p1d00ahc4cwhcf241tg	cmlxv2p1c00abc4cw1p0yn39r	OPP_3	OPPOSITION	cmlxuh5et002wc4cw78m7rgdb	Георги	68.0	\N	2026-02-22 14:46:56.832	2026-02-22 17:12:24.471
cmlxv2p1d00aic4cw31qhgn4j	cmlxv2p1c00abc4cw1p0yn39r	OPP_REPLY	OPPOSITION	cmlxuh5eo002uc4cwnqqwq7e7	Яна Т.	33.5	\N	2026-02-22 14:46:56.832	2026-02-22 17:12:24.471
cmlxv2p1d00ajc4cwho1pw7wx	cmlxv2p1c00abc4cw1p0yn39r	PROP_REPLY	PROPOSITION	cmlxugkm1002qc4cwdvqxcvjd	Кристалина	35.5	\N	2026-02-22 14:46:56.832	2026-02-22 17:12:24.472
cmlxv2p1700a3c4cwlo2py2u5	cmlxv2p1600a2c4cw0qqmu9n6	PROP_1	PROPOSITION	cmlxugklo002mc4cwqscogg8i	Елица	63.0	\N	2026-02-22 14:46:56.826	2026-02-22 17:12:26.352
cmlxv2p1700a4c4cw63tz1yv3	cmlxv2p1600a2c4cw0qqmu9n6	OPP_1	OPPOSITION	cmlxuh5eh002sc4cwnnw1k008	Яна С.	66.5	\N	2026-02-22 14:46:56.826	2026-02-22 17:12:26.354
cmlxv2p1700a5c4cwbqts9m7j	cmlxv2p1600a2c4cw0qqmu9n6	PROP_2	PROPOSITION	cmlxugkm1002qc4cwdvqxcvjd	Кристалина	69.0	\N	2026-02-22 14:46:56.826	2026-02-22 17:12:26.355
cmlxv2p1700a6c4cwak45p1iw	cmlxv2p1600a2c4cw0qqmu9n6	OPP_2	OPPOSITION	cmlxuh5eo002uc4cwnqqwq7e7	Яна Т.	70.0	\N	2026-02-22 14:46:56.826	2026-02-22 17:12:26.356
cmlxv2p1700a7c4cwqqr1459z	cmlxv2p1600a2c4cw0qqmu9n6	PROP_3	PROPOSITION	cmlxugklw002oc4cw3fr608er	Иван	62.5	\N	2026-02-22 14:46:56.826	2026-02-22 17:12:26.357
cmlxv2p1700a8c4cwuefiykg3	cmlxv2p1600a2c4cw0qqmu9n6	OPP_3	OPPOSITION	cmlxuh5et002wc4cw78m7rgdb	Георги	65.0	\N	2026-02-22 14:46:56.826	2026-02-22 17:12:26.357
cmlxv2p1700a9c4cwhpyjjnv0	cmlxv2p1600a2c4cw0qqmu9n6	OPP_REPLY	OPPOSITION	cmlxuh5eo002uc4cwnqqwq7e7	Яна Т.	35.0	\N	2026-02-22 14:46:56.826	2026-02-22 17:12:26.358
cmlxv2p1700aac4cw29ddy6vh	cmlxv2p1600a2c4cw0qqmu9n6	PROP_REPLY	PROPOSITION	cmlxugkm1002qc4cwdvqxcvjd	Кристалина	34.0	\N	2026-02-22 14:46:56.826	2026-02-22 17:12:26.359
cmlxv2p1q00atc4cwv8qijgbz	cmlxv2p1p00amc4cwb8gmjmgc	OPP_REPLY	OPPOSITION	cmlxuhs9y0034c4cwsocop6z5	Васил	32.5	\N	2026-02-22 14:46:56.844	2026-02-22 16:54:41.442
cmlxv2p1q00auc4cwfah9grs5	cmlxv2p1p00amc4cwb8gmjmgc	PROP_REPLY	PROPOSITION	cmlxuhinh0032c4cw8wl8zgiz	Иван	34.0	\N	2026-02-22 14:46:56.844	2026-02-22 16:54:41.443
cmlxv2p2100ayc4cwivsps4tg	cmlxv2p2000axc4cwuiqho0mq	PROP_1	PROPOSITION	cmlxui4o9003cc4cwsgvf2kcx	Есер	68.0	\N	2026-02-22 14:46:56.856	2026-02-22 17:00:03.548
cmlxv2p2200azc4cw8378ohel	cmlxv2p2000axc4cwuiqho0mq	OPP_1	OPPOSITION	cmlxuifz0003ec4cwtm83bysf	Никола	69.5	\N	2026-02-22 14:46:56.856	2026-02-22 17:00:03.551
cmlxv2p2200b0c4cwq6qajurd	cmlxv2p2000axc4cwuiqho0mq	PROP_2	PROPOSITION	cmlxui4o4003ac4cw7xvfnct0	Арман	69.0	\N	2026-02-22 14:46:56.856	2026-02-22 17:00:03.552
cmlxv2p2200b1c4cwn5vpjtvv	cmlxv2p2000axc4cwuiqho0mq	OPP_2	OPPOSITION	cmlxuifzb003ic4cwoqxznuyv	Люси	67.5	\N	2026-02-22 14:46:56.856	2026-02-22 17:00:03.553
cmlxv2p2200b2c4cw45ea2vc6	cmlxv2p2000axc4cwuiqho0mq	PROP_3	PROPOSITION	cmlxui4o9003cc4cwsgvf2kcx	Есер	68.0	\N	2026-02-22 14:46:56.856	2026-02-22 17:00:03.554
cmlxv2p2200b3c4cwdgvc00pv	cmlxv2p2000axc4cwuiqho0mq	OPP_3	OPPOSITION	cmlxuifz6003gc4cwvz8jwgpj	Раяна	67.0	\N	2026-02-22 14:46:56.856	2026-02-22 17:00:03.554
cmlxv2p2200b4c4cwl2cr78v1	cmlxv2p2000axc4cwuiqho0mq	OPP_REPLY	OPPOSITION	cmlxuifz0003ec4cwtm83bysf	Никола	33.5	\N	2026-02-22 14:46:56.856	2026-02-22 17:00:03.555
cmlxv2p2200b5c4cwyqblnoim	cmlxv2p2000axc4cwuiqho0mq	PROP_REPLY	PROPOSITION	cmlxui4o4003ac4cw7xvfnct0	Арман	33.5	\N	2026-02-22 14:46:56.856	2026-02-22 17:00:03.556
\.


--
-- Data for Name: DebateResult; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."DebateResult" (id, "debateId", "winningSide", "winningTeamId", "propTotalAvg", "oppTotalAvg", "voteProp", "voteOpp", "decidedByChair", "createdAt", "updatedAt") FROM stdin;
cmlxzmz4a0005wocw4cvccz17	cmlxv2p1g00akc4cwjdsphe1a	PROPOSITION	cmlxuen7a0022c4cwvhslbhv5	245.5	235.5	1	0	f	2026-02-22 16:54:41.482	2026-02-22 16:54:41.482
cmlxztvns0006wocw70nireja	cmlxv2p1t00avc4cw1c41dqlr	PROPOSITION	cmlxufar30026c4cwwpfy1fuq	238.5	237.5	1	0	f	2026-02-22 17:00:03.592	2026-02-22 17:00:03.592
cmly09sse0007wocwi2w2qkkt	cmlxv2p0y009zc4cwbl91sgc9	OPPOSITION	cmlxuegtg0020c4cwkupov6ux	230.3	234.8	0	2	f	2026-02-22 17:12:26.366	2026-02-22 17:12:26.366
cmly0wk5j0008wocwzdvypp8g	cmlxv2p0h009oc4cw0m618bg5	OPPOSITION	cmlxudyvq001wc4cw0t34xbrn	247.0	248.0	0	1	f	2026-02-22 17:30:08.263	2026-02-22 17:30:08.263
\.


--
-- Data for Name: DebateStopwatch; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."DebateStopwatch" (id, "debateId", running, "startedAtMs", "baseElapsedMs", version, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Institution; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Institution" (id, name, "createdAt") FROM stdin;
inst_40f8e1dc-2333-4081-9ff4-0de93a25655a	BP 1	2026-02-22 14:00:21.707
inst_8f06e93d-2f07-4438-b50a-795a41f5fe67	BP 2	2026-02-22 14:00:29.298
inst_b36dedcf-e9dd-4a20-bccb-1fc1ef59a3a8	BP 3	2026-02-22 14:00:36.503
inst_78fea116-293d-4420-bfaf-4a1c3992217d	BP 4	2026-02-22 14:00:43.429
inst_1991deba-ad51-43cb-be42-3e6f2240430b	Independent Adjudicators	2026-02-22 14:01:42.47
inst_0796a23c-7d3c-468f-bb9f-0afee7ea4b73	WSDC 1	2026-02-22 14:27:37.962
inst_f3099a6b-301d-4a92-b45c-a86fc0138953	WSDC 2	2026-02-22 14:27:43.182
inst_3a861a7d-44de-45f7-977e-b9307aff4597	WSDC 3	2026-02-22 14:27:50.338
inst_cb9db084-cbd7-41a8-b23a-d63b591ee1cc	WSDC 4	2026-02-22 14:28:06.422
inst_bcc3cdd6-f1ff-477b-ac68-37cd268be165	WSDC 5	2026-02-22 14:28:14.704
inst_4247472f-f62a-4e52-b964-961d6dd98398	WSDC 6	2026-02-22 14:28:40.104
inst_78258f0a-ea1b-4f55-b00a-3d457d082de4	WSDC 7	2026-02-22 14:28:45.224
inst_834c9718-8cc3-4d24-aace-fa378b1a8f03	WSDC 8	2026-02-22 14:28:50.5
\.


--
-- Data for Name: InstitutionMember; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."InstitutionMember" (id, "institutionId", "userId", role, "createdAt") FROM stdin;
\.


--
-- Data for Name: Tournament; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Tournament" (id, name, "createdByUserId", "createdAt", "registrationClosesAt", "teamMaxSize", "teamMinSize") FROM stdin;
tourn_66c6eb41-ebae-45a6-8776-966885112ae7	BP Spar Nedelq	user_34yW8uCNdYLH76ZnBtAErCe3aUp	2026-02-22 13:51:32.615	\N	5	2
tourn_2af053ab-8007-4217-87d5-4987a0de8e36	WSDC Spar Nedelq	user_34yW8uCNdYLH76ZnBtAErCe3aUp	2026-02-22 14:26:35.781	\N	5	2
\.


--
-- Data for Name: TournamentDebate; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TournamentDebate" (id, "roundId", "order", "propTeamId", "oppTeamId", "isBye", "createdAt", "updatedAt", "venueId") FROM stdin;
cmlxup7t5007dc4cwn09xrmkj	cmlxthazx000vc4cwsnubdpid	0	\N	\N	f	2026-02-22 14:36:27.977	2026-02-22 14:36:27.977	cmlxta6wl0004c4cwyessyqas
cmlxv2p0h009oc4cw0m618bg5	cmlxv15lo0081c4cw13h3u5in	0	cmlxuduuz001uc4cwz20vtks6	cmlxudyvq001wc4cw0t34xbrn	f	2026-02-22 14:46:56.801	2026-02-22 14:46:56.801	cmlxumoco005cc4cwfk17h4rm
cmlxv2p0y009zc4cwbl91sgc9	cmlxv15lo0081c4cw13h3u5in	1	cmlxue4eg001yc4cwy2ur65fn	cmlxuegtg0020c4cwkupov6ux	f	2026-02-22 14:46:56.818	2026-02-22 14:46:56.818	cmlxums08005dc4cw89mypnvu
cmlxv2p1g00akc4cwjdsphe1a	cmlxv15lo0081c4cw13h3u5in	2	cmlxuen7a0022c4cwvhslbhv5	cmlxuf6t30024c4cwmdotcr94	f	2026-02-22 14:46:56.836	2026-02-22 14:46:56.836	cmlxumvnm005ec4cw8nv3x7h7
cmlxv2p1t00avc4cw1c41dqlr	cmlxv15lo0081c4cw13h3u5in	3	cmlxufar30026c4cwwpfy1fuq	cmlxufetn0028c4cwvqvdkzan	f	2026-02-22 14:46:56.849	2026-02-22 14:46:56.849	cmlxumz9s005fc4cw0hlh6r1y
\.


--
-- Data for Name: TournamentDebateJudge; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TournamentDebateJudge" (id, "debateId", "participantId", "createdAt", role) FROM stdin;
cmlxup7t7007ec4cwr1y2l4lq	cmlxup7t5007dc4cwn09xrmkj	cmlxtgimm000tc4cwk2iiqs98	2026-02-22 14:36:27.977	CHAIR
cmlxv2p0o009pc4cwy6a1nywd	cmlxv2p0h009oc4cw0m618bg5	cmlxuj50z003kc4cwh3cuv773	2026-02-22 14:46:56.801	CHAIR
cmlxv2p0z00a0c4cwlj2uyaav	cmlxv2p0y009zc4cwbl91sgc9	cmlxuj513003lc4cw80ja9itb	2026-02-22 14:46:56.818	CHAIR
cmlxv2p0z00a1c4cwt91twyln	cmlxv2p0y009zc4cwbl91sgc9	cmlxuj516003mc4cwr8ghdvtp	2026-02-22 14:46:56.818	PANELIST
cmlxv2p1i00alc4cwcajz9c48	cmlxv2p1g00akc4cwjdsphe1a	cmlxuj519003nc4cwm4s44h1h	2026-02-22 14:46:56.836	CHAIR
cmlxv2p1t00awc4cwp5iyyg85	cmlxv2p1t00avc4cw1c41dqlr	cmlxuj51c003oc4cwhk6bvu6v	2026-02-22 14:46:56.849	CHAIR
\.


--
-- Data for Name: TournamentDebateTeamSlot; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TournamentDebateTeamSlot" (id, "debateId", "teamId", "position") FROM stdin;
cmlxup7t9007fc4cwsfck6tpt	cmlxup7t5007dc4cwn09xrmkj	cmlxtesbi0007c4cwtwxljcmi	BP_OG
cmlxup7t9007gc4cwzm3x29s4	cmlxup7t5007dc4cwn09xrmkj	cmlxtey610009c4cwny6zacmg	BP_OO
cmlxup7t9007hc4cwozx4p53w	cmlxup7t5007dc4cwn09xrmkj	cmlxtf3q7000bc4cwoxvos1se	BP_CG
cmlxup7t9007ic4cweoxx4849	cmlxup7t5007dc4cwn09xrmkj	cmlxtf92k000dc4cwrzrsgeoy	BP_CO
\.


--
-- Data for Name: TournamentInstitution; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TournamentInstitution" (id, "tournamentId", "institutionId", status, "requestedByUserId", "createdAt") FROM stdin;
cmlxtesb60006c4cwwm4b0pas	tourn_66c6eb41-ebae-45a6-8776-966885112ae7	inst_40f8e1dc-2333-4081-9ff4-0de93a25655a	APPROVED	user_34yW8uCNdYLH76ZnBtAErCe3aUp	2026-02-22 14:00:21.714
cmlxtey5x0008c4cwrx4fluem	tourn_66c6eb41-ebae-45a6-8776-966885112ae7	inst_8f06e93d-2f07-4438-b50a-795a41f5fe67	APPROVED	user_34yW8uCNdYLH76ZnBtAErCe3aUp	2026-02-22 14:00:29.301
cmlxtf3q3000ac4cw6aeqnqox	tourn_66c6eb41-ebae-45a6-8776-966885112ae7	inst_b36dedcf-e9dd-4a20-bccb-1fc1ef59a3a8	APPROVED	user_34yW8uCNdYLH76ZnBtAErCe3aUp	2026-02-22 14:00:36.507
cmlxtf92h000cc4cwrnjclijz	tourn_66c6eb41-ebae-45a6-8776-966885112ae7	inst_78fea116-293d-4420-bfaf-4a1c3992217d	APPROVED	user_34yW8uCNdYLH76ZnBtAErCe3aUp	2026-02-22 14:00:43.433
cmlxtgimh000sc4cwyw1ujq07	tourn_66c6eb41-ebae-45a6-8776-966885112ae7	inst_1991deba-ad51-43cb-be42-3e6f2240430b	APPROVED	user_34yW8uCNdYLH76ZnBtAErCe3aUp	2026-02-22 14:01:42.473
cmlxuduuo001tc4cwvu2fygo0	tourn_2af053ab-8007-4217-87d5-4987a0de8e36	inst_0796a23c-7d3c-468f-bb9f-0afee7ea4b73	APPROVED	user_34yW8uCNdYLH76ZnBtAErCe3aUp	2026-02-22 14:27:37.968
cmlxudyvm001vc4cwu54p8j0l	tourn_2af053ab-8007-4217-87d5-4987a0de8e36	inst_f3099a6b-301d-4a92-b45c-a86fc0138953	APPROVED	user_34yW8uCNdYLH76ZnBtAErCe3aUp	2026-02-22 14:27:43.186
cmlxue4ed001xc4cwjh4y7vgz	tourn_2af053ab-8007-4217-87d5-4987a0de8e36	inst_3a861a7d-44de-45f7-977e-b9307aff4597	APPROVED	user_34yW8uCNdYLH76ZnBtAErCe3aUp	2026-02-22 14:27:50.341
cmlxuegt7001zc4cw06kusyf1	tourn_2af053ab-8007-4217-87d5-4987a0de8e36	inst_cb9db084-cbd7-41a8-b23a-d63b591ee1cc	APPROVED	user_34yW8uCNdYLH76ZnBtAErCe3aUp	2026-02-22 14:28:06.427
cmlxuen760021c4cwfq6cvbf0	tourn_2af053ab-8007-4217-87d5-4987a0de8e36	inst_bcc3cdd6-f1ff-477b-ac68-37cd268be165	APPROVED	user_34yW8uCNdYLH76ZnBtAErCe3aUp	2026-02-22 14:28:14.706
cmlxuf6st0023c4cwtub1rhnj	tourn_2af053ab-8007-4217-87d5-4987a0de8e36	inst_4247472f-f62a-4e52-b964-961d6dd98398	APPROVED	user_34yW8uCNdYLH76ZnBtAErCe3aUp	2026-02-22 14:28:40.109
cmlxufaqz0025c4cw2sn8yef4	tourn_2af053ab-8007-4217-87d5-4987a0de8e36	inst_78258f0a-ea1b-4f55-b00a-3d457d082de4	APPROVED	user_34yW8uCNdYLH76ZnBtAErCe3aUp	2026-02-22 14:28:45.226
cmlxufetj0027c4cwrbsng54r	tourn_2af053ab-8007-4217-87d5-4987a0de8e36	inst_834c9718-8cc3-4d24-aace-fa378b1a8f03	APPROVED	user_34yW8uCNdYLH76ZnBtAErCe3aUp	2026-02-22 14:28:50.503
cmlxuj50s003jc4cwh7cps37a	tourn_2af053ab-8007-4217-87d5-4987a0de8e36	inst_1991deba-ad51-43cb-be42-3e6f2240430b	APPROVED	user_34yW8uCNdYLH76ZnBtAErCe3aUp	2026-02-22 14:31:44.428
\.


--
-- Data for Name: TournamentParticipant; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TournamentParticipant" (id, "tournamentId", "userId", "institutionId", role, "createdAt") FROM stdin;
cmlxtfhvk000ec4cwylq28qyy	tourn_66c6eb41-ebae-45a6-8776-966885112ae7	guest_082c6738-0266-4a38-9093-1c9934fe19c6	inst_40f8e1dc-2333-4081-9ff4-0de93a25655a	DEBATER	2026-02-22 14:00:54.848
cmlxtfhvx000gc4cwbn0xey3o	tourn_66c6eb41-ebae-45a6-8776-966885112ae7	guest_09bff5a1-5f0d-4f44-95f0-1ba87c2a8957	inst_40f8e1dc-2333-4081-9ff4-0de93a25655a	DEBATER	2026-02-22 14:00:54.861
cmlxtfmwu000ic4cwl5bb25ms	tourn_66c6eb41-ebae-45a6-8776-966885112ae7	guest_537e36e7-b8fa-4ecc-89d4-ccb4452b2cf2	inst_8f06e93d-2f07-4438-b50a-795a41f5fe67	DEBATER	2026-02-22 14:01:01.374
cmlxtfuil000kc4cwzbkakujf	tourn_66c6eb41-ebae-45a6-8776-966885112ae7	guest_dd618b00-2996-4eff-93d5-0008d09497f7	inst_b36dedcf-e9dd-4a20-bccb-1fc1ef59a3a8	DEBATER	2026-02-22 14:01:11.229
cmlxtfuip000mc4cwtxj0l2fb	tourn_66c6eb41-ebae-45a6-8776-966885112ae7	guest_0a48245b-896d-4131-b509-5477215a51b7	inst_b36dedcf-e9dd-4a20-bccb-1fc1ef59a3a8	DEBATER	2026-02-22 14:01:11.233
cmlxtg3in000oc4cwtctsrofw	tourn_66c6eb41-ebae-45a6-8776-966885112ae7	guest_096ff716-2e4e-462f-9dff-9e53d5a771bf	inst_78fea116-293d-4420-bfaf-4a1c3992217d	DEBATER	2026-02-22 14:01:22.895
cmlxtg3ix000qc4cw0s3viivy	tourn_66c6eb41-ebae-45a6-8776-966885112ae7	guest_e84d8e24-23c1-47a4-9ceb-7222deb0531d	inst_78fea116-293d-4420-bfaf-4a1c3992217d	DEBATER	2026-02-22 14:01:22.905
cmlxtgimm000tc4cwk2iiqs98	tourn_66c6eb41-ebae-45a6-8776-966885112ae7	guest_a5f4d944-1a0d-4da7-97dc-348f5e2c302c	inst_1991deba-ad51-43cb-be42-3e6f2240430b	JUDGE	2026-02-22 14:01:42.478
cmlxufsfn0029c4cw4c9cnbls	tourn_2af053ab-8007-4217-87d5-4987a0de8e36	guest_b15535d4-1a59-4d2e-9471-ecbea9bf4653	inst_0796a23c-7d3c-468f-bb9f-0afee7ea4b73	DEBATER	2026-02-22 14:29:08.147
cmlxufsfx002bc4cwg7ix5mrt	tourn_2af053ab-8007-4217-87d5-4987a0de8e36	guest_f7518827-4287-4d03-aea6-a916b841bc2a	inst_0796a23c-7d3c-468f-bb9f-0afee7ea4b73	DEBATER	2026-02-22 14:29:08.157
cmlxufsg2002dc4cwitn35ppe	tourn_2af053ab-8007-4217-87d5-4987a0de8e36	guest_b117a062-34f3-44a6-9423-68f12fbeb015	inst_0796a23c-7d3c-468f-bb9f-0afee7ea4b73	DEBATER	2026-02-22 14:29:08.162
cmlxug5r5002fc4cwl3c31yvv	tourn_2af053ab-8007-4217-87d5-4987a0de8e36	guest_e6585c10-47e0-4bf3-8c6a-2708cec09063	inst_f3099a6b-301d-4a92-b45c-a86fc0138953	DEBATER	2026-02-22 14:29:25.409
cmlxug5rf002hc4cwy1r4wmmw	tourn_2af053ab-8007-4217-87d5-4987a0de8e36	guest_73a6557a-18f6-4640-8283-e92128a2fc5f	inst_f3099a6b-301d-4a92-b45c-a86fc0138953	DEBATER	2026-02-22 14:29:25.419
cmlxug5rk002jc4cwnnqe4cip	tourn_2af053ab-8007-4217-87d5-4987a0de8e36	guest_b4eb799e-e410-4c7e-a344-4f2113ec5373	inst_f3099a6b-301d-4a92-b45c-a86fc0138953	DEBATER	2026-02-22 14:29:25.424
cmlxugklj002lc4cwel24q84r	tourn_2af053ab-8007-4217-87d5-4987a0de8e36	guest_f8ab0f04-57df-4e5f-9bc9-d8c17f47ec45	inst_3a861a7d-44de-45f7-977e-b9307aff4597	DEBATER	2026-02-22 14:29:44.647
cmlxugklu002nc4cwuh4fsbw9	tourn_2af053ab-8007-4217-87d5-4987a0de8e36	guest_0f3f6a48-632c-4975-9cc1-9f6bc97b8431	inst_3a861a7d-44de-45f7-977e-b9307aff4597	DEBATER	2026-02-22 14:29:44.658
cmlxugklz002pc4cwzejben9z	tourn_2af053ab-8007-4217-87d5-4987a0de8e36	guest_bb270970-334c-46d4-869e-4afbd993efea	inst_3a861a7d-44de-45f7-977e-b9307aff4597	DEBATER	2026-02-22 14:29:44.663
cmlxuh5ed002rc4cwwe2v5pzo	tourn_2af053ab-8007-4217-87d5-4987a0de8e36	guest_e1c2e5c9-7e1e-4464-afbc-bd38dab040fd	inst_cb9db084-cbd7-41a8-b23a-d63b591ee1cc	DEBATER	2026-02-22 14:30:11.605
cmlxuh5en002tc4cwug0ik1g4	tourn_2af053ab-8007-4217-87d5-4987a0de8e36	guest_5e9ceb39-7154-48fa-bc21-1b940a83c6ec	inst_cb9db084-cbd7-41a8-b23a-d63b591ee1cc	DEBATER	2026-02-22 14:30:11.614
cmlxuh5er002vc4cwqbs7m53s	tourn_2af053ab-8007-4217-87d5-4987a0de8e36	guest_07b657d7-8ad9-4d1c-bae0-c788580c042c	inst_cb9db084-cbd7-41a8-b23a-d63b591ee1cc	DEBATER	2026-02-22 14:30:11.619
cmlxuhin5002xc4cwmxdi2a5j	tourn_2af053ab-8007-4217-87d5-4987a0de8e36	guest_e1082115-0152-4f3c-8309-35036f8fc492	inst_bcc3cdd6-f1ff-477b-ac68-37cd268be165	DEBATER	2026-02-22 14:30:28.769
cmlxuhinb002zc4cwty9ngwpa	tourn_2af053ab-8007-4217-87d5-4987a0de8e36	guest_9d23f62c-7a34-4c5a-a9f6-1b3b02dcc387	inst_bcc3cdd6-f1ff-477b-ac68-37cd268be165	DEBATER	2026-02-22 14:30:28.775
cmlxuhinf0031c4cw6su6n1va	tourn_2af053ab-8007-4217-87d5-4987a0de8e36	guest_f1045f02-24ee-4755-8237-aaa293453cf3	inst_bcc3cdd6-f1ff-477b-ac68-37cd268be165	DEBATER	2026-02-22 14:30:28.779
cmlxuhs9u0033c4cwqpaanhv2	tourn_2af053ab-8007-4217-87d5-4987a0de8e36	guest_3761e2a3-ff2f-4228-83c5-1dd5b6771d29	inst_4247472f-f62a-4e52-b964-961d6dd98398	DEBATER	2026-02-22 14:30:41.25
cmlxuhsa40035c4cwk0iyfxj2	tourn_2af053ab-8007-4217-87d5-4987a0de8e36	guest_8c64c309-32cb-4051-960d-472d7363064c	inst_4247472f-f62a-4e52-b964-961d6dd98398	DEBATER	2026-02-22 14:30:41.26
cmlxuhsa80037c4cwbazl8xr3	tourn_2af053ab-8007-4217-87d5-4987a0de8e36	guest_82df1db6-6d15-4b13-af57-df79988fe824	inst_4247472f-f62a-4e52-b964-961d6dd98398	DEBATER	2026-02-22 14:30:41.264
cmlxui4o20039c4cwkm14eocp	tourn_2af053ab-8007-4217-87d5-4987a0de8e36	guest_ae4796b4-2632-4496-a38e-eec9138528c6	inst_78258f0a-ea1b-4f55-b00a-3d457d082de4	DEBATER	2026-02-22 14:30:57.314
cmlxui4o7003bc4cwmo6hyy5e	tourn_2af053ab-8007-4217-87d5-4987a0de8e36	guest_afb928b7-6c09-467c-8bcc-056539b567ec	inst_78258f0a-ea1b-4f55-b00a-3d457d082de4	DEBATER	2026-02-22 14:30:57.319
cmlxuifyv003dc4cwm9yr3jxm	tourn_2af053ab-8007-4217-87d5-4987a0de8e36	guest_03a6f136-5eaa-4529-972e-025a8d6bcb87	inst_834c9718-8cc3-4d24-aace-fa378b1a8f03	DEBATER	2026-02-22 14:31:11.959
cmlxuifz5003fc4cwkz2u1d2u	tourn_2af053ab-8007-4217-87d5-4987a0de8e36	guest_5de1184a-8763-4abc-96df-f6b1cc8bfa10	inst_834c9718-8cc3-4d24-aace-fa378b1a8f03	DEBATER	2026-02-22 14:31:11.969
cmlxuifza003hc4cwgpn8afik	tourn_2af053ab-8007-4217-87d5-4987a0de8e36	guest_f7e59c45-f15d-45f4-8ce4-5022e492941a	inst_834c9718-8cc3-4d24-aace-fa378b1a8f03	DEBATER	2026-02-22 14:31:11.974
cmlxuj50z003kc4cwh3cuv773	tourn_2af053ab-8007-4217-87d5-4987a0de8e36	guest_3e8bbbfe-ff76-440f-a002-0d4c53dae375	inst_1991deba-ad51-43cb-be42-3e6f2240430b	JUDGE	2026-02-22 14:31:44.435
cmlxuj513003lc4cw80ja9itb	tourn_2af053ab-8007-4217-87d5-4987a0de8e36	guest_e87419c3-4322-4962-84d1-ea5640ff8bac	inst_1991deba-ad51-43cb-be42-3e6f2240430b	JUDGE	2026-02-22 14:31:44.439
cmlxuj516003mc4cwr8ghdvtp	tourn_2af053ab-8007-4217-87d5-4987a0de8e36	guest_86e94546-63d8-42b9-a57f-81dcf5b1bb1a	inst_1991deba-ad51-43cb-be42-3e6f2240430b	JUDGE	2026-02-22 14:31:44.442
cmlxuj519003nc4cwm4s44h1h	tourn_2af053ab-8007-4217-87d5-4987a0de8e36	guest_85ce5e0d-82e2-4a14-a8ac-dd1a94d513a9	inst_1991deba-ad51-43cb-be42-3e6f2240430b	JUDGE	2026-02-22 14:31:44.445
cmlxuj51c003oc4cwhk6bvu6v	tourn_2af053ab-8007-4217-87d5-4987a0de8e36	guest_63c2bf45-12c5-41e7-8c40-fdd2c48d7676	inst_1991deba-ad51-43cb-be42-3e6f2240430b	JUDGE	2026-02-22 14:31:44.448
\.


--
-- Data for Name: TournamentRound; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TournamentRound" (id, "tournamentId", number, name, status, "createdAt", "updatedAt", "infoSlide", motion) FROM stdin;
cmlxthazx000vc4cwsnubdpid	tourn_66c6eb41-ebae-45a6-8776-966885112ae7	1	Round 1	IN_PROGRESS	2026-02-22 14:02:19.245	2026-02-22 14:40:13.84	\N	Тест
cmlxv15lo0081c4cw13h3u5in	tourn_2af053ab-8007-4217-87d5-4987a0de8e36	1	Spar Nedelq	COMPLETED	2026-02-22 14:45:44.988	2026-02-22 17:31:45.003	\N	This House believes that sports teams should be punished with point deductions for repeated serious fan violence during matches\n (For example: fighting, throwing objects, using fireworks or weapons in the stadium).
\.


--
-- Data for Name: TournamentSettings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TournamentSettings" (id, "tournamentId", "registrationOpensAt", "registrationClosesAt", "teamSizeMin", "teamSizeMax", "createdAt", "updatedAt", "debateFormat", "eventMode", "pairingSystem", "showDebaterNames", "rankPointsFirst", "rankPointsFourth", "rankPointsSecond", "rankPointsThird", "speakerScaleMax", "speakerScaleMin", "isIronman") FROM stdin;
cmlxt3g22009144cw4vs0ua4q	tourn_66c6eb41-ebae-45a6-8776-966885112ae7	\N	\N	1	2	2026-02-22 13:51:32.615	2026-02-22 13:57:07.063	BP	IRL	SWISS	t	3	0	2	1	85	65	t
cmlxucivc001rc4cwzfi1xv2l	tourn_2af053ab-8007-4217-87d5-4987a0de8e36	\N	\N	2	5	2026-02-22 14:26:35.781	2026-02-22 14:26:40.61	WSDC	IRL	SWISS	t	3	0	2	1	\N	\N	f
\.


--
-- Data for Name: TournamentTeam; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TournamentTeam" (id, "tournamentId", "institutionId", name, "createdByUserId", "createdAt", "updatedAt") FROM stdin;
cmlxtesbi0007c4cwtwxljcmi	tourn_66c6eb41-ebae-45a6-8776-966885112ae7	inst_40f8e1dc-2333-4081-9ff4-0de93a25655a	BP 1 1	user_34yW8uCNdYLH76ZnBtAErCe3aUp	2026-02-22 14:00:21.726	2026-02-22 14:00:21.726
cmlxtey610009c4cwny6zacmg	tourn_66c6eb41-ebae-45a6-8776-966885112ae7	inst_8f06e93d-2f07-4438-b50a-795a41f5fe67	BP 2 1	user_34yW8uCNdYLH76ZnBtAErCe3aUp	2026-02-22 14:00:29.305	2026-02-22 14:00:29.305
cmlxtf3q7000bc4cwoxvos1se	tourn_66c6eb41-ebae-45a6-8776-966885112ae7	inst_b36dedcf-e9dd-4a20-bccb-1fc1ef59a3a8	BP 3 1	user_34yW8uCNdYLH76ZnBtAErCe3aUp	2026-02-22 14:00:36.511	2026-02-22 14:00:36.511
cmlxtf92k000dc4cwrzrsgeoy	tourn_66c6eb41-ebae-45a6-8776-966885112ae7	inst_78fea116-293d-4420-bfaf-4a1c3992217d	BP 4 1	user_34yW8uCNdYLH76ZnBtAErCe3aUp	2026-02-22 14:00:43.436	2026-02-22 14:00:43.436
cmlxuduuz001uc4cwz20vtks6	tourn_2af053ab-8007-4217-87d5-4987a0de8e36	inst_0796a23c-7d3c-468f-bb9f-0afee7ea4b73	WSDC 1 1	user_34yW8uCNdYLH76ZnBtAErCe3aUp	2026-02-22 14:27:37.978	2026-02-22 14:27:37.978
cmlxudyvq001wc4cw0t34xbrn	tourn_2af053ab-8007-4217-87d5-4987a0de8e36	inst_f3099a6b-301d-4a92-b45c-a86fc0138953	WSDC 2 1	user_34yW8uCNdYLH76ZnBtAErCe3aUp	2026-02-22 14:27:43.19	2026-02-22 14:27:43.19
cmlxue4eg001yc4cwy2ur65fn	tourn_2af053ab-8007-4217-87d5-4987a0de8e36	inst_3a861a7d-44de-45f7-977e-b9307aff4597	WSDC 3 1	user_34yW8uCNdYLH76ZnBtAErCe3aUp	2026-02-22 14:27:50.344	2026-02-22 14:27:50.344
cmlxuegtg0020c4cwkupov6ux	tourn_2af053ab-8007-4217-87d5-4987a0de8e36	inst_cb9db084-cbd7-41a8-b23a-d63b591ee1cc	WSDC 4 1	user_34yW8uCNdYLH76ZnBtAErCe3aUp	2026-02-22 14:28:06.436	2026-02-22 14:28:06.436
cmlxuen7a0022c4cwvhslbhv5	tourn_2af053ab-8007-4217-87d5-4987a0de8e36	inst_bcc3cdd6-f1ff-477b-ac68-37cd268be165	WSDC 5 1	user_34yW8uCNdYLH76ZnBtAErCe3aUp	2026-02-22 14:28:14.71	2026-02-22 14:28:14.71
cmlxuf6t30024c4cwmdotcr94	tourn_2af053ab-8007-4217-87d5-4987a0de8e36	inst_4247472f-f62a-4e52-b964-961d6dd98398	WSDC 6 1	user_34yW8uCNdYLH76ZnBtAErCe3aUp	2026-02-22 14:28:40.117	2026-02-22 14:28:40.117
cmlxufar30026c4cwwpfy1fuq	tourn_2af053ab-8007-4217-87d5-4987a0de8e36	inst_78258f0a-ea1b-4f55-b00a-3d457d082de4	WSDC 7 1	user_34yW8uCNdYLH76ZnBtAErCe3aUp	2026-02-22 14:28:45.23	2026-02-22 14:28:45.23
cmlxufetn0028c4cwvqvdkzan	tourn_2af053ab-8007-4217-87d5-4987a0de8e36	inst_834c9718-8cc3-4d24-aace-fa378b1a8f03	WSDC 8 1	user_34yW8uCNdYLH76ZnBtAErCe3aUp	2026-02-22 14:28:50.507	2026-02-22 14:28:50.507
\.


--
-- Data for Name: TournamentTeamMember; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TournamentTeamMember" (id, "teamId", "participantId", "createdAt") FROM stdin;
cmlxtfhvs000fc4cw6g653r94	cmlxtesbi0007c4cwtwxljcmi	cmlxtfhvk000ec4cwylq28qyy	2026-02-22 14:00:54.856
cmlxtfhvz000hc4cw7cm1bdt2	cmlxtesbi0007c4cwtwxljcmi	cmlxtfhvx000gc4cwbn0xey3o	2026-02-22 14:00:54.863
cmlxtfmww000jc4cwn1hblnc2	cmlxtey610009c4cwny6zacmg	cmlxtfmwu000ic4cwl5bb25ms	2026-02-22 14:01:01.376
cmlxtfuim000lc4cwii9y3di8	cmlxtf3q7000bc4cwoxvos1se	cmlxtfuil000kc4cwzbkakujf	2026-02-22 14:01:11.23
cmlxtfuir000nc4cwyed4gxmf	cmlxtf3q7000bc4cwoxvos1se	cmlxtfuip000mc4cwtxj0l2fb	2026-02-22 14:01:11.235
cmlxtg3ir000pc4cwm7pp9iha	cmlxtf92k000dc4cwrzrsgeoy	cmlxtg3in000oc4cwtctsrofw	2026-02-22 14:01:22.899
cmlxtg3iy000rc4cw5tanthh0	cmlxtf92k000dc4cwrzrsgeoy	cmlxtg3ix000qc4cw0s3viivy	2026-02-22 14:01:22.906
cmlxufsfs002ac4cwvrekeqpp	cmlxuduuz001uc4cwz20vtks6	cmlxufsfn0029c4cw4c9cnbls	2026-02-22 14:29:08.152
cmlxufsfz002cc4cw8z9l9m1r	cmlxuduuz001uc4cwz20vtks6	cmlxufsfx002bc4cwg7ix5mrt	2026-02-22 14:29:08.159
cmlxufsg4002ec4cwle0ss7yj	cmlxuduuz001uc4cwz20vtks6	cmlxufsg2002dc4cwitn35ppe	2026-02-22 14:29:08.164
cmlxug5r9002gc4cwprblwzs8	cmlxudyvq001wc4cw0t34xbrn	cmlxug5r5002fc4cwl3c31yvv	2026-02-22 14:29:25.413
cmlxug5rg002ic4cwaoc4wcc8	cmlxudyvq001wc4cw0t34xbrn	cmlxug5rf002hc4cwy1r4wmmw	2026-02-22 14:29:25.42
cmlxug5rl002kc4cwcf35llai	cmlxudyvq001wc4cw0t34xbrn	cmlxug5rk002jc4cwnnqe4cip	2026-02-22 14:29:25.425
cmlxugklo002mc4cwqscogg8i	cmlxue4eg001yc4cwy2ur65fn	cmlxugklj002lc4cwel24q84r	2026-02-22 14:29:44.652
cmlxugklw002oc4cw3fr608er	cmlxue4eg001yc4cwy2ur65fn	cmlxugklu002nc4cwuh4fsbw9	2026-02-22 14:29:44.66
cmlxugkm1002qc4cwdvqxcvjd	cmlxue4eg001yc4cwy2ur65fn	cmlxugklz002pc4cwzejben9z	2026-02-22 14:29:44.665
cmlxuh5eh002sc4cwnnw1k008	cmlxuegtg0020c4cwkupov6ux	cmlxuh5ed002rc4cwwe2v5pzo	2026-02-22 14:30:11.609
cmlxuh5eo002uc4cwnqqwq7e7	cmlxuegtg0020c4cwkupov6ux	cmlxuh5en002tc4cwug0ik1g4	2026-02-22 14:30:11.616
cmlxuh5et002wc4cw78m7rgdb	cmlxuegtg0020c4cwkupov6ux	cmlxuh5er002vc4cwqbs7m53s	2026-02-22 14:30:11.621
cmlxuhin7002yc4cwkq72ony7	cmlxuen7a0022c4cwvhslbhv5	cmlxuhin5002xc4cwmxdi2a5j	2026-02-22 14:30:28.771
cmlxuhinc0030c4cwedpzxo4a	cmlxuen7a0022c4cwvhslbhv5	cmlxuhinb002zc4cwty9ngwpa	2026-02-22 14:30:28.776
cmlxuhinh0032c4cw8wl8zgiz	cmlxuen7a0022c4cwvhslbhv5	cmlxuhinf0031c4cw6su6n1va	2026-02-22 14:30:28.781
cmlxuhs9y0034c4cwsocop6z5	cmlxuf6t30024c4cwmdotcr94	cmlxuhs9u0033c4cwqpaanhv2	2026-02-22 14:30:41.254
cmlxuhsa50036c4cwxinqz7mk	cmlxuf6t30024c4cwmdotcr94	cmlxuhsa40035c4cwk0iyfxj2	2026-02-22 14:30:41.261
cmlxuhsaa0038c4cwnrq1oked	cmlxuf6t30024c4cwmdotcr94	cmlxuhsa80037c4cwbazl8xr3	2026-02-22 14:30:41.266
cmlxui4o4003ac4cw7xvfnct0	cmlxufar30026c4cwwpfy1fuq	cmlxui4o20039c4cwkm14eocp	2026-02-22 14:30:57.316
cmlxui4o9003cc4cwsgvf2kcx	cmlxufar30026c4cwwpfy1fuq	cmlxui4o7003bc4cwmo6hyy5e	2026-02-22 14:30:57.321
cmlxuifz0003ec4cwtm83bysf	cmlxufetn0028c4cwvqvdkzan	cmlxuifyv003dc4cwm9yr3jxm	2026-02-22 14:31:11.964
cmlxuifz6003gc4cwvz8jwgpj	cmlxufetn0028c4cwvqvdkzan	cmlxuifz5003fc4cwkz2u1d2u	2026-02-22 14:31:11.97
cmlxuifzb003ic4cwoqxznuyv	cmlxufetn0028c4cwvqvdkzan	cmlxuifza003hc4cwgpn8afik	2026-02-22 14:31:11.975
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."User" (id, email, username, "imageUrl", "createdAt", "updatedAt", "firstName", "lastName", bio, "displayName", pronouns, "publicEmail", "updatedProfileAt") FROM stdin;
user_34yW8uCNdYLH76ZnBtAErCe3aUp	emoniksp@gmail.com	\N	https://img.clerk.com/eyJ0eXBlIjoicHJveHkiLCJzcmMiOiJodHRwczovL2ltYWdlcy5jbGVyay5kZXYvb2F1dGhfZ29vZ2xlL2ltZ18zNHlXOHdoUzdXMTNHWTQycXFGWndRcGZGNWsifQ	2026-02-22 13:51:18.969	2026-02-22 13:51:18.969	Emil	Spasov	\N	\N	\N	f	\N
guest_082c6738-0266-4a38-9093-1c9934fe19c6	\N	\N	\N	2026-02-22 14:00:54.845	2026-02-22 14:00:54.845	Софи	\N	\N	Софи	\N	f	\N
guest_09bff5a1-5f0d-4f44-95f0-1ba87c2a8957	\N	\N	\N	2026-02-22 14:00:54.859	2026-02-22 14:00:54.859	Елена	\N	\N	Елена	\N	f	\N
guest_537e36e7-b8fa-4ecc-89d4-ccb4452b2cf2	\N	\N	\N	2026-02-22 14:01:01.372	2026-02-22 14:01:01.372	Сава	\N	\N	Сава	\N	f	\N
guest_dd618b00-2996-4eff-93d5-0008d09497f7	\N	\N	\N	2026-02-22 14:01:11.227	2026-02-22 14:01:11.227	Кирил	\N	\N	Кирил	\N	f	\N
guest_0a48245b-896d-4131-b509-5477215a51b7	\N	\N	\N	2026-02-22 14:01:11.232	2026-02-22 14:01:11.232	Алекс	\N	\N	Алекс	\N	f	\N
guest_096ff716-2e4e-462f-9dff-9e53d5a771bf	\N	\N	\N	2026-02-22 14:01:22.892	2026-02-22 14:01:22.892	Амели	\N	\N	Амели	\N	f	\N
guest_e84d8e24-23c1-47a4-9ceb-7222deb0531d	\N	\N	\N	2026-02-22 14:01:22.903	2026-02-22 14:01:22.903	Пламен	\N	\N	Пламен	\N	f	\N
guest_a5f4d944-1a0d-4da7-97dc-348f5e2c302c	\N	\N	\N	2026-02-22 14:01:42.476	2026-02-22 14:01:42.476	Кати	\N	\N	Кати	\N	f	\N
guest_b15535d4-1a59-4d2e-9471-ecbea9bf4653	\N	\N	\N	2026-02-22 14:29:08.144	2026-02-22 14:29:08.144	Алекс	\N	\N	Алекс	\N	f	\N
guest_f7518827-4287-4d03-aea6-a916b841bc2a	\N	\N	\N	2026-02-22 14:29:08.156	2026-02-22 14:29:08.156	Мони	\N	\N	Мони	\N	f	\N
guest_b117a062-34f3-44a6-9423-68f12fbeb015	\N	\N	\N	2026-02-22 14:29:08.161	2026-02-22 14:29:08.161	Калоян	\N	\N	Калоян	\N	f	\N
guest_e6585c10-47e0-4bf3-8c6a-2708cec09063	\N	\N	\N	2026-02-22 14:29:25.407	2026-02-22 14:29:25.407	Кари	\N	\N	Кари	\N	f	\N
guest_73a6557a-18f6-4640-8283-e92128a2fc5f	\N	\N	\N	2026-02-22 14:29:25.417	2026-02-22 14:29:25.417	Михаел	\N	\N	Михаел	\N	f	\N
guest_b4eb799e-e410-4c7e-a344-4f2113ec5373	\N	\N	\N	2026-02-22 14:29:25.422	2026-02-22 14:29:25.422	Георги	\N	\N	Георги	\N	f	\N
guest_f8ab0f04-57df-4e5f-9bc9-d8c17f47ec45	\N	\N	\N	2026-02-22 14:29:44.644	2026-02-22 14:29:44.644	Елица	\N	\N	Елица	\N	f	\N
guest_0f3f6a48-632c-4975-9cc1-9f6bc97b8431	\N	\N	\N	2026-02-22 14:29:44.656	2026-02-22 14:29:44.656	Иван	\N	\N	Иван	\N	f	\N
guest_bb270970-334c-46d4-869e-4afbd993efea	\N	\N	\N	2026-02-22 14:29:44.662	2026-02-22 14:29:44.662	Кристалина	\N	\N	Кристалина	\N	f	\N
guest_e1c2e5c9-7e1e-4464-afbc-bd38dab040fd	\N	\N	\N	2026-02-22 14:30:11.603	2026-02-22 14:30:11.603	Яна	С.	\N	Яна С.	\N	f	\N
guest_5e9ceb39-7154-48fa-bc21-1b940a83c6ec	\N	\N	\N	2026-02-22 14:30:11.613	2026-02-22 14:30:11.613	Яна	Т.	\N	Яна Т.	\N	f	\N
guest_07b657d7-8ad9-4d1c-bae0-c788580c042c	\N	\N	\N	2026-02-22 14:30:11.618	2026-02-22 14:30:11.618	Георги	\N	\N	Георги	\N	f	\N
guest_e1082115-0152-4f3c-8309-35036f8fc492	\N	\N	\N	2026-02-22 14:30:28.768	2026-02-22 14:30:28.768	Деница	\N	\N	Деница	\N	f	\N
guest_9d23f62c-7a34-4c5a-a9f6-1b3b02dcc387	\N	\N	\N	2026-02-22 14:30:28.773	2026-02-22 14:30:28.773	Аракси	\N	\N	Аракси	\N	f	\N
guest_f1045f02-24ee-4755-8237-aaa293453cf3	\N	\N	\N	2026-02-22 14:30:28.778	2026-02-22 14:30:28.778	Иван	\N	\N	Иван	\N	f	\N
guest_3761e2a3-ff2f-4228-83c5-1dd5b6771d29	\N	\N	\N	2026-02-22 14:30:41.247	2026-02-22 14:30:41.247	Васил	\N	\N	Васил	\N	f	\N
guest_8c64c309-32cb-4051-960d-472d7363064c	\N	\N	\N	2026-02-22 14:30:41.258	2026-02-22 14:30:41.258	Ангел	\N	\N	Ангел	\N	f	\N
guest_82df1db6-6d15-4b13-af57-df79988fe824	\N	\N	\N	2026-02-22 14:30:41.262	2026-02-22 14:30:41.262	Симеон	\N	\N	Симеон	\N	f	\N
guest_ae4796b4-2632-4496-a38e-eec9138528c6	\N	\N	\N	2026-02-22 14:30:57.313	2026-02-22 14:30:57.313	Арман	\N	\N	Арман	\N	f	\N
guest_afb928b7-6c09-467c-8bcc-056539b567ec	\N	\N	\N	2026-02-22 14:30:57.317	2026-02-22 14:30:57.317	Есер	\N	\N	Есер	\N	f	\N
guest_03a6f136-5eaa-4529-972e-025a8d6bcb87	\N	\N	\N	2026-02-22 14:31:11.957	2026-02-22 14:31:11.957	Никола	\N	\N	Никола	\N	f	\N
guest_5de1184a-8763-4abc-96df-f6b1cc8bfa10	\N	\N	\N	2026-02-22 14:31:11.968	2026-02-22 14:31:11.968	Раяна	\N	\N	Раяна	\N	f	\N
guest_f7e59c45-f15d-45f4-8ce4-5022e492941a	\N	\N	\N	2026-02-22 14:31:11.972	2026-02-22 14:31:11.972	Люси	\N	\N	Люси	\N	f	\N
guest_3e8bbbfe-ff76-440f-a002-0d4c53dae375	\N	\N	\N	2026-02-22 14:31:44.433	2026-02-22 14:31:44.433	Нелла	\N	\N	Нелла	\N	f	\N
guest_e87419c3-4322-4962-84d1-ea5640ff8bac	\N	\N	\N	2026-02-22 14:31:44.438	2026-02-22 14:31:44.438	Хриси	\N	\N	Хриси	\N	f	\N
guest_86e94546-63d8-42b9-a57f-81dcf5b1bb1a	\N	\N	\N	2026-02-22 14:31:44.441	2026-02-22 14:31:44.441	Даниел	\N	\N	Даниел	\N	f	\N
guest_85ce5e0d-82e2-4a14-a8ac-dd1a94d513a9	\N	\N	\N	2026-02-22 14:31:44.444	2026-02-22 14:31:44.444	Любо	\N	\N	Любо	\N	f	\N
guest_63c2bf45-12c5-41e7-8c40-fdd2c48d7676	\N	\N	\N	2026-02-22 14:31:44.447	2026-02-22 14:31:44.447	Виктория	\N	\N	Виктория	\N	f	\N
user_39qxGTMNRn4SJ5tenX7IcjRlLet	golemi@pishkisoriz.com	\N	https://img.clerk.com/eyJ0eXBlIjoiZGVmYXVsdCIsImlpZCI6Imluc18zMzljTXpXTWFBeGlkT1BRdTZYQVh2MWttT1MiLCJyaWQiOiJ1c2VyXzM5cXhHVE1OUm40U0o1dGVuWDdJY2pSbExldCIsImluaXRpYWxzIjoiRE0ifQ	2026-02-22 19:30:39.96	2026-02-22 21:29:21.682	Dimitar	Mitev	I like to make drama and fire teachers for one valid reason.	Дукова Гейминг	she/the/and/only	f	2026-02-22 21:29:21.68
\.


--
-- Data for Name: Venue; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Venue" (id, "tournamentId", name, priority, "isActive", "createdAt", "updatedAt") FROM stdin;
cmlxta6wl0004c4cwyessyqas	tourn_66c6eb41-ebae-45a6-8776-966885112ae7	Стая 1	100	t	2026-02-22 13:56:47.348	2026-02-22 13:56:47.348
cmlxumoco005cc4cwfk17h4rm	tourn_2af053ab-8007-4217-87d5-4987a0de8e36	Стая 2	100	t	2026-02-22 14:34:29.447	2026-02-22 14:34:29.447
cmlxums08005dc4cw89mypnvu	tourn_2af053ab-8007-4217-87d5-4987a0de8e36	Стая 3	100	t	2026-02-22 14:34:34.184	2026-02-22 14:34:34.184
cmlxumvnm005ec4cw8nv3x7h7	tourn_2af053ab-8007-4217-87d5-4987a0de8e36	Стая 4	100	t	2026-02-22 14:34:38.913	2026-02-22 14:34:38.913
cmlxumz9s005fc4cw0hlh6r1y	tourn_2af053ab-8007-4217-87d5-4987a0de8e36	Стая 5	100	t	2026-02-22 14:34:43.599	2026-02-22 14:34:43.599
\.


--
-- Data for Name: VenueCategory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."VenueCategory" (id, "tournamentId", name, description, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: _VenueToVenueCategory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."_VenueToVenueCategory" ("A", "B") FROM stdin;
\.


--
-- PostgreSQL database dump complete
--

\unrestrict zswCGFXdWUWDSkd6d4aZtagdOakSYOEFT6Cc6uz2EW9iwU1jewhJ4JLgLf6BAgN

