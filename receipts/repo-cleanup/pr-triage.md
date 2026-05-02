# PR Triage

Generated: 2026-05-02

## Scope
- Open PRs analyzed: 660
- Generated packet PRs (build/proj_*): 655
- Non-build PRs (detailed review): 5

## Classification Rules Used
- KEEP_AND_MERGE: green checks, mergeable, clean scope
- KEEP_BUT_REBASE: useful work mixed with junk or behind main
- SUPERSEDED_CLOSE: generated packet PR superseded by cleanup integration PR
- BROKEN_FIX_FIRST: failing checks/conflicts before merge
- UNKNOWN_REVIEW: insufficient signal, manual review needed

## Detailed Non-Build PR Decisions
- #1230 Orchestrator: Autonomous approval policy to unblock builder
  - Head: fix/orchestrator-autonomous-approval-policy
  - Base: main
  - Status checks: Baseline required checks:FAILURE; Strict readiness audit:SKIPPED; Required PR Gate:SKIPPED
  - Class: BROKEN_FIX_FIRST
  - Notes: Failing required checks; very large diff (>300 files) includes generated artifacts and needs selective extraction.
  - URL: https://github.com/skylersemailaddress-debug/Botomatic/pull/1230
- #1229 Builder forensic single-window measurement: 0% PASS_REAL (root cause identified)
  - Head: fix/builder-forensic-single-window-measurement
  - Base: main
  - Status checks: Baseline required checks:SUCCESS; Strict readiness audit:SUCCESS; Required PR Gate:SUCCESS
  - Class: KEEP_BUT_REBASE
  - Notes: Checks passing; contains valuable forensic harness/reporting work mixed with generated artifacts.
  - URL: https://github.com/skylersemailaddress-debug/Botomatic/pull/1229
- #1228 Run builder forensic harness on live runtime path
  - Head: fix/builder-forensic-real-runtime-pass
  - Base: main
  - Status checks: Baseline required checks:SUCCESS; Strict readiness audit:SUCCESS; Required PR Gate:SUCCESS
  - Class: KEEP_BUT_REBASE
  - Notes: Checks passing; includes runtime/forensic improvements mixed with screenshot/run spam.
  - URL: https://github.com/skylersemailaddress-debug/Botomatic/pull/1228
- #1227 Add forensic builder capability stress harness
  - Head: fix/builder-forensic-capability-stress
  - Base: main
  - Status checks: Baseline required checks:SUCCESS; Strict readiness audit:SUCCESS; Required PR Gate:SUCCESS
  - Class: KEEP_BUT_REBASE
  - Notes: Checks passing; useful stress harness and scripts mixed with generated artifacts.
  - URL: https://github.com/skylersemailaddress-debug/Botomatic/pull/1227
- #1223 fix: keep commercial workspace visible on Chromebook
  - Head: fix/chromebook-commercial-ui-runtime-clean
  - Base: main
  - Status checks: Baseline required checks:FAILURE; Strict readiness audit:SKIPPED; Required PR Gate:SKIPPED
  - Class: BROKEN_FIX_FIRST
  - Notes: Conflicting + failing checks; includes UI/runtime files requiring explicit lock audit before any merge.
  - URL: https://github.com/skylersemailaddress-debug/Botomatic/pull/1223

## Generated Packet PRs
- Class: SUPERSEDED_CLOSE
- Reason: Head branch pattern build/proj_* is generated packet output and does not represent curated integration-quality changes.
- Action: close after cleanup PR is open and links preservation location.

### Packet PR Numbers
#1231, #1222, #1221, #1220, #1219, #1218, #1217, #1216, #1215, #1214, #1213, #1212, #1211, #1210, #1209, #1208, #1207, #1206, #1205, #1204, #1203, #1202, #1201, #1200, #1199, #1198, #1197, #1196, #1195, #1194, #1193, #1192, #1191, #1190, #1189, #1188, #1187, #1186, #1185, #1184, #1183, #1182, #1181, #1180, #1179, #1178, #1177, #1176, #1175, #1174, #1173, #1172, #1171, #1170, #1169, #1168, #1167, #1166, #1165, #1164, #1163, #1162, #1161, #1160, #1159, #1158, #1157, #1156, #1155, #1154, #1153, #1152, #1151, #1150, #1149, #1148, #1147, #1146, #1145, #1144, #1143, #1142, #1141, #1140, #1139, #1138, #1137, #1136, #1135, #1134, #1133, #1132, #1131, #1129, #1128, #1127, #1126, #1125, #1124, #1123, #1122, #1121, #1120, #1119, #1118, #1117, #1116, #1115, #1114, #1113, #1112, #1111, #1110, #1109, #1108, #1107, #1106, #1105, #1104, #1103, #1102, #1101, #1100, #1099, #1098, #1097, #1096, #1095, #1094, #1093, #1092, #1091, #1090, #1089, #1088, #1087, #1086, #1085, #1084, #1083, #1082, #1081, #1080, #1079, #1078, #1077, #1076, #1075, #1074, #1073, #1072, #1071, #1070, #1069, #1068, #1067, #1066, #1065, #1064, #1063, #1062, #1061, #1060, #1059, #1058, #1057, #1056, #1055, #1054, #1053, #1052, #1051, #1050, #1049, #1048, #1047, #1046, #1045, #1044, #1043, #1042, #1041, #1040, #1039, #1038, #1037, #1036, #1035, #1034, #1033, #1032, #1031, #1030, #1029, #1028, #1027, #1026, #1025, #1024, #1023, #1022, #1021, #1020, #1019, #1018, #1017, #1016, #1015, #1014, #1013, #1012, #1011, #1010, #1009, #1008, #1007, #1006, #1005, #1004, #1003, #1002, #1001, #1000, #999, #998, #997, #996, #995, #994, #993, #992, #991, #990, #989, #988, #987, #986, #985, #984, #983, #982, #981, #980, #979, #978, #977, #976, #975, #974, #973, #972, #971, #970, #969, #968, #967, #966, #965, #964, #963, #962, #961, #960, #959, #958, #957, #956, #955, #954, #953, #952, #951, #950, #949, #948, #947, #946, #945, #944, #943, #942, #941, #940, #939, #938, #937, #936, #935, #934, #933, #932, #931, #930, #929, #928, #927, #926, #925, #924, #923, #922, #921, #920, #919, #918, #917, #916, #915, #914, #913, #912, #911, #910, #909, #908, #907, #906, #905, #904, #903, #902, #901, #900, #899, #898, #897, #896, #895, #894, #893, #892, #891, #890, #889, #888, #887, #886, #885, #884, #883, #882, #881, #880, #879, #878, #877, #876, #875, #874, #873, #872, #871, #870, #869, #868, #867, #866, #865, #864, #863, #862, #861, #860, #859, #858, #857, #856, #855, #854, #853, #852, #851, #850, #849, #848, #847, #846, #845, #844, #843, #842, #841, #840, #839, #838, #837, #836, #835, #834, #833, #832, #831, #830, #829, #828, #827, #826, #825, #824, #823, #822, #821, #820, #819, #818, #817, #816, #815, #814, #813, #812, #811, #810, #809, #808, #807, #806, #805, #804, #803, #802, #801, #800, #799, #798, #797, #796, #795, #794, #793, #792, #791, #790, #789, #788, #787, #786, #785, #784, #783, #782, #781, #780, #779, #778, #777, #776, #775, #774, #773, #772, #771, #770, #769, #768, #767, #766, #765, #764, #763, #762, #761, #760, #759, #758, #757, #756, #755, #754, #753, #752, #751, #750, #749, #748, #747, #746, #745, #744, #743, #742, #741, #740, #739, #738, #737, #736, #735, #734, #733, #732, #731, #730, #729, #728, #727, #726, #725, #724, #723, #722, #721, #720, #719, #718, #717, #716, #715, #714, #713, #712, #711, #710, #709, #708, #707, #706, #705, #704, #703, #702, #701, #700, #699, #698, #697, #696, #695, #694, #693, #692, #691, #690, #689, #688, #687, #686, #685, #684, #683, #682, #681, #680, #679, #678, #677, #676, #675, #674, #673, #672, #671, #670, #669, #668, #667, #666, #665, #664, #663, #662, #661, #660, #659, #658, #657, #653, #652, #651, #650, #649, #648, #647, #646, #645, #644, #643, #642, #641, #640, #639, #638, #637, #636, #635, #634, #633, #632, #631, #630, #629, #628, #627, #625, #624, #623, #622, #621, #620, #619, #618, #617, #616, #615, #614, #613, #612, #611, #610, #609, #608, #607, #606, #605, #604, #603, #602, #601, #600, #599, #598, #597, #596, #595, #592, #591, #590, #589, #588, #587, #586, #585, #584, #583, #582, #581, #580, #579, #578, #577, #576, #575, #574, #573, #572, #571, #570, #569, #568, #567, #566, #565, #564, #563, #562

## Recommended Merge Path
- Build one clean integration PR from fix/repo-pr-stack-cleanup to main.
- Preserve valid autonomous policy/harness/forensic/source changes only.
- Exclude generated runtime folders, screenshots, run archives, and log spam.
