let config = window.BOTTLE_CONFIG || {};

const state = {
  currentQuestion: null,
  client: null,
  publicMessages: [],
  visiblePublicMessages: [],
  polls: [],
  publicFilterMode: "default",
  publicSortMode: "newest_first",
  questionTypeFilter: "all",
  questionPoolFilter: "all",
  answerQuestionTypeFilter: "all",
  hiddenPublicMessageIds: [],
  savedMessages: {},
  quietMode: false,
  language: "zh",
  linkedPublicMessageId: "",
  visitorToken: "",
  hadStoredVisitorToken: false,
  ownerTokenHash: "",
  currentClaimTokenHash: ""
};

const RECENT_QUESTIONS_KEY = "questionBottle.recentQuestionIds";
const VISITOR_TOKEN_KEY = "questionBottle.visitorToken";
const HIDDEN_PUBLIC_MESSAGES_KEY = "questionBottle.hiddenPublicMessageIds";
const LOCAL_QUESTION_TOKENS_KEY = "questionBottle.localQuestionTokens";
const LOCAL_QUESTIONS_KEY = "questionBottle.localQuestions";
const SAVED_MESSAGES_KEY = "questionBottle.savedMessages";
const QUIET_MODE_KEY = "questionBottle.quietMode";
const LANGUAGE_KEY = "questionBottle.language";
const SEEN_QUESTIONS_META_KEY = "questionBottle.seenQuestionMeta";
const THEME_KEY = "questionBottle.theme";
const POLL_VOTES_KEY = "questionBottle.pollVotes";
const POLLS_FRONTEND_ENABLED = window.BOTTLE_ENABLE_POLLS === true;
const MAX_RECENT_QUESTIONS = 12;
const PUBLIC_MESSAGE_COLLAPSE_LENGTH = 140;
const PUBLIC_MESSAGE_FOCUS_MS = 1600;

const blockedTerms = [
  "spam.example",
  "加微信",
  "博彩",
  "裸聊",
  "贷款"
];

const SEED_QUESTION_TEXTS = [
  "你最近循环最多的一首歌是什么？",
  "今天有没有发生什么根本不值得发朋友圈、但你记住了的小事？",
  "你最近最常重复的一句话是什么？",
  "最近有没有什么东西在慢慢消耗你？",
  "你最近删掉过什么？",
  "最近一次熬夜，你在干什么？",
  "你现在最不想听到别人对你说什么？",
  "你有没有一个一直没舍得退出的AI聊天框？它对你有什么意义？",
  "最近有没有一句话，你已经想好很久，但一直没发出去？",
  "有没有一个人，你先要恢复联系，现在已经不知道该怎么重新开口？他过的怎么样？",
  "你最近一次突然不想解释了，是因为什么？",
  "最近有没有一个瞬间，让你突然觉得和一个人的关系变了？",
  "有没有谁其实对你很好，但你一直没认真回应过？",
  "有没有一天，你现在回头看，会觉得像分界线？",
  "你最近一次感觉“时间过得太快”是在什么时候？",
  "有没有什么东西，你以前天天接触，现在却突然消失了？",
  "有没有什么事情没人问过你，但你希望被询问？",
  "最近有没有什么事情，你本来以为自己已经不在意了？",
  "有没有什么话，你现在已经不打算再解释了？",
  "最近有没有一个瞬间，你突然很想离开现在的生活？",
  "你最近最不想面对的一件事是什么？",
  "你最近有没有在哪一瞬间突然很想回到以前？",
  "如果今天只能留下一句话，你会写什么？",
  "你最近吃到最好吃的东西是什么？",
  "最近有没有一首歌突然又重新开始听了？",
  "你最近一次出门是为了什么？",
  "你现在最常逃避的一件小事是什么？",
  "最近有没有一件小事，让你突然心情变好了一点？",
  "最近有没有什么东西，你一直想整理，但始终没动？",
  "你最近有没有突然意识到，某段时间已经过去很久了？",
  "有没有一个地方，你现在经过时还是会下意识看一眼？",
  "最近有没有什么东西，其实你已经想丢掉很久了？",
  "你最近最常发呆的时候是在干什么？",
  "最近有没有什么话，你差一点就说出口了？",
  "你最近一次真正睡好觉是什么时候？",
  "有没有什么东西，你以前特别在意，现在已经无所谓了？",
  "你最近有没有突然很想关掉所有聊天软件？",
  "有没有什么地方，你一直说想去，但到现在还没去？",
  "最近有没有什么没有定论的事情，你其实已经知道结果了？",
  "你对自己高考最后的结果满意吗？",
  "你高中毕业后的那个暑假，是怎么度过的？",
  "回想一个离开了你的重要的人，你现在对他有何态度？",
  "你吃甜粽子还是咸粽子？",
  "你对AI的依赖程度高吗？",
  "你下个周末最想做的一件事是什么？",
  "有没有一个人，你现在已经不想再了解他的消息了？",
  "有没有什么习惯在你自己都没意识到的时候已经形成了？",
  "最近有没有什么事情，你其实很想重新来一次？",
  "你最近有没有在哪一刻突然觉得自己长大了？",
  "你最近最常重复听到的一句话是什么？",
  "最近有没有什么事情，你明知道应该做，但一直拖着？",
  "你最近有没有什么想买但一直没买的东西？",
  "最近有没有一个瞬间，你突然不想回那个人的消息了？",
  "你最近最常点的外卖是什么？",
  "你最近一次睡过头是在什么时候？",
  "你最近是不是懒得出门？",
  "你最近一次认真收拾房间或宿舍是什么时候？",
  "最近有没有什么事情，你拖着拖着就忘了？",
  "你最近最常打开但其实没什么要看的软件是什么？",
  "你最近一次突然很困是在干什么？",
  "最近有没有哪一天，你几乎什么都没干？",
  "你最近有没有突然特别想吃某样东西？",
  "你最近最经常在哪个时间点睡觉？",
  "最近有没有什么事情，本来很担心，后来发现其实没什么？",
  "你最近最常待的地方是哪里？",
  "最近有没有什么事情，你原本很期待，后来却没什么感觉了？",
  "你最近最常一个人待着的时候在干什么？"
];

const SEED_QUESTIONS = [...new Set(SEED_QUESTION_TEXTS)].map((text, index) => ({
  id: `seed-question-${String(index + 1).padStart(3, "0")}`,
  text,
  is_seed: true,
  source: "owner_seed",
  may_be_ai_generated: true
}));

const SITE_NOTE = {
  version: "6.2",
  textKey: "update.text"
};

const I18N = {
  zh: {
    "app.title": "匿名留言瓶",
    "app.eyebrow": "匿名留言 · 问题漂流瓶",
    "app.intro": "可以匿名发一条短留言，也可以留下问题等别人回答。这里不需要账号，也不会显示名字。",
    "app.privacy": "这里不使用账号。其他人不会看到是谁写的内容。网站只用一个保存在你浏览器里的本地 token，帮你管理自己的内容。请不要提交敏感个人信息；托管和数据库服务仍可能有技术日志。",
    "update.text": "强化白日主题玻璃层次，修正移动端彩虹渐变，并补充常见问题。",
    "theme.night": "夜间",
    "theme.day": "日间",
    "theme.grass": "青草",
    "theme.orange": "橘子",
    "theme.ocean": "海洋",
    "theme.tree": "树木",
    "theme.rainbow": "彩虹",
    "nav.board": "留言板",
    "nav.ask": "留下问题",
    "nav.answer": "回答陌生人",
    "nav.check": "查看回复",
    "nav.mine": "查看我留下的内容",
    "nav.saved": "本地收藏",
    "nav.more": "更多功能",
    "nav.feedback": "意见箱",
    "dock.board": "留言",
    "dock.answer": "漂流",
    "dock.ask": "提问",
    "dock.mine": "我的",
    "dock.saved": "收藏",
    "dock.feedback": "意见",
    "dock.more": "更多",
    "dock.settings": "设置",
    "tips.title": "提示",
    "settings.eyebrow": "设置",
    "settings.title": "设置",
    "settings.appearance": "外观",
    "faq.title": "常见问题",
    "faq.vpnQuestion": "为什么需要 VPN 访问？",
    "faq.vpnAnswer": "网站部署在海外服务上，不同网络环境访问速度可能不同。如果打不开，换个网络或使用稳定的代理可能会更顺。",
    "faq.copyQuestion": "复制公共留言板的链接可以干些什么？",
    "faq.copyAnswer": "它可以直接打开某条公开留言，方便稍后回来，或发给朋友看同一条内容。私人链接仍然只用于查看自己的回复。",
    "faq.privateQuestion": "私人链接和公共链接有什么区别？",
    "faq.privateAnswer": "私人链接用于查看你自己问题收到的回复；公共链接只定位到公开留言板上的一条内容。请不要把私人链接当作公开展示入口。",
    "faq.localQuestion": "换手机或清浏览器后还能找回内容吗？",
    "faq.localAnswer": "本地记录依赖当前浏览器保存的 token 和历史链接。换设备、清缓存或无痕浏览都可能丢失本地索引，所以重要内容请先自己保存。",
    "faq.pollQuestion": "投票功能什么时候开放？",
    "faq.pollAnswer": "前端已经预留完成，但需要先手动执行数据库迁移。迁移完成前，页面不会尝试加载投票数据。",
    "siteInfo.title": "网站信息",
    "siteInfo.project": "这是 Figaro 运用 OpenAI 工具完成制作的匿名留言空间，所有编程工作都由 AI 完成。",
    "siteInfo.author": "作者",
    "siteInfo.copyright": "© Figaro. 内容与界面仍在持续实验和维护中，请不要复制为误导性的同名服务。",
    "siteInfo.privacy": "网站围绕匿名使用设计：没有账号系统，普通匿名内容不会连接到真实身份；用于找回本机内容的 owner token 会先在浏览器中哈希后再提交。开发者通常不能从正常匿名流程中直接识别具体用户。也请理解，没有任何联网系统能承诺绝对匿名；托管、数据库和网络服务仍可能处理请求。如果未来出现违法滥用，可能需要适度管理。",
    "stage.current": "当前空间",
    "actions.random": "随机浏览",
    "actions.resurface": "重新漂流",
    "actions.quiet": "安静模式",
    "actions.restore": "恢复节奏",
    "actions.translate": "翻译",
    "actions.publish": "发布",
    "actions.randomOne": "随机看一条",
    "actions.refresh": "刷新",
    "actions.createLink": "生成私人链接",
    "actions.copy": "复制",
    "actions.drawQuestion": "抽一个问题",
    "actions.nextQuestion": "换一个",
    "actions.sendAnswer": "发送回答",
    "actions.viewReplies": "查看回复",
    "actions.submit": "提交",
    "actions.save": "收藏",
    "actions.saved": "已收藏",
    "actions.like": "喜欢",
    "actions.liked": "已喜欢",
    "actions.replyOpen": "展开回复",
    "actions.replyClose": "收起回复",
    "actions.copyLink": "复制链接",
    "actions.hide": "隐藏此条",
    "actions.edit": "编辑",
    "actions.delete": "删除",
    "actions.expand": "展开全文",
    "actions.collapse": "收起",
    "actions.openSaved": "重新打开",
    "actions.removeSaved": "取消收藏",
    "kind.qa": "公开问答",
    "kind.saved": "本地收藏",
    "board.title": "公共留言板",
    "board.description": "公开显示的匿名短消息。可以发问、打招呼，或说一点近况。",
    "board.inputLabel": "公开匿名留言",
    "board.placeholder": "例如：有没有人也在等一个消息？",
    "board.messages": "留言",
    "controls.filter": "筛选",
    "controls.sort": "排序",
    "controls.type": "类型",
    "filter.default": "全部",
    "filter.unanswered": "只看未回复",
    "filter.related": "和我有关",
    "filter.questions": "公开问答",
    "filter.messages": "普通留言",
    "filter.polls": "投票",
    "questionType.all": "全部",
    "questionType.life": "生活",
    "questionType.relationships": "关系",
    "questionType.memory": "回忆",
    "questionType.mood": "情绪",
    "questionType.study": "学习",
    "questionType.ai": "AI",
    "questionType.other": "其他",
    "sort.newest": "最新在前",
    "sort.replied": "最近有回应",
    "sort.oldest": "最早在前",
    "sort.liked": "点赞最多",
    "sort.recommended": "综合排序",
    "ask.title": "留下一个问题",
    "ask.description": "把一个问题留给随机路过的人。保存链接后可以回来查看回复。",
    "ask.inputLabel": "你的问题",
    "ask.placeholder": "例如：遇到这种情况，你会怎么想？",
    "ask.publicConsent": "如果有人回答，且对方也同意，这组匿名问答可以公开显示。",
    "ask.saveLink": "保存这个私人链接",
    "ask.saveLinkHint": "以后用这条链接或 token 查看这个问题的回复。",
    "ask.noAccountHint": "链接丢了就无法找回，因为这里没有账号系统。",
    "answer.title": "回答一个陌生问题",
    "answer.description": "抽一个别人留下的问题。回答可以很短。",
    "answer.empty": "点击下面的按钮抽取一个问题。",
    "answer.selfHint": "没有账号系统，所以问题池里也可能包含你自己投出的匿名问题。抽到了自己的问题，重新抽取即可。",
    "answer.pool": "问题池",
    "answer.poolAll": "全部问题",
    "answer.poolSeed": "只看种子问题",
    "answer.poolUser": "只看用户问题",
    "answer.seedNotice": "种子问题会不定期补充；回答会作为公开匿名留言显示在留言板。",
    "answer.inputLabel": "你的匿名回答",
    "answer.placeholder": "写你的回答。",
    "answer.publicConsent": "如果提问者也同意，这组匿名问答可以公开显示。",
    "check.title": "查看我的回复",
    "check.description": "粘贴私人链接，或输入链接末尾的 token。",
    "check.inputLabel": "私人链接或 token",
    "check.placeholder": "例如：https://.../?token=abc 或 abc",
    "mine.title": "查看我留下的内容",
    "mine.description": "如果当前浏览器保存过本地记录，可以在这里查看自己的问题、回复和留言。",
    "saved.title": "本地收藏",
    "saved.description": "只保存在当前浏览器里的内容。可以稍后重新打开、重新漂流。",
    "more.title": "更多功能",
    "more.description": "一些不适合放在主界面的小功能，会先安静地放在这里。",
    "more.feedback": "去意见箱",
    "more.settings": "打开设置",
    "more.pollsLater": "投票功能已经先收进这里，等后端数据库迁移审批后再开放。",
    "poll.title": "匿名投票",
    "poll.description": "创建 2 到 4 个选项的小投票。数据库迁移审批并执行后即可开放。",
    "poll.questionLabel": "投票问题",
    "poll.questionPlaceholder": "例如：今晚你更想做什么？",
    "poll.optionPlaceholder1": "选项 1",
    "poll.optionPlaceholder2": "选项 2",
    "poll.optionPlaceholder3": "选项 3（可选）",
    "poll.optionPlaceholder4": "选项 4（可选）",
    "poll.keepPublic": "结束后仍保留公开结果。",
    "poll.localHint": "不需要邮箱、手机号或登录；本机 token 会用于避免重复投票。",
    "poll.create": "创建投票",
    "poll.refresh": "刷新投票",
    "poll.loading": "正在读取投票。",
    "poll.empty": "还没有正在进行的投票。",
    "poll.missing": "投票功能需要先应用 6.0 数据库迁移。",
    "poll.vote": "投票",
    "poll.voted": "已投",
    "poll.total": "{count} 票",
    "poll.alreadyVoted": "这台设备已经投过票。",
    "poll.end": "结束投票",
    "poll.closed": "已结束",
    "feedback.title": "意见箱",
    "feedback.description": "匿名留下使用反馈、问题或想法。内容只给开发者查看，不会出现在留言板。",
    "feedback.type": "类型",
    "feedback.kindFeedback": "使用反馈",
    "feedback.kindProblem": "遇到问题",
    "feedback.kindIdea": "一点想法",
    "feedback.kindOther": "其他",
    "feedback.inputLabel": "内容",
    "feedback.placeholder": "写下你遇到的问题，或对这个网站的想法。",
    "feedback.note": "这不是公开评论区，也不是客服系统。请不要留下敏感个人信息。",
    "guide.entry": "阅读使用指南",
    "guide.eyebrow": "使用指南",
    "guide.title": "轻轻使用就好",
    "guide.step1Title": "留言",
    "guide.step1Body": "写短消息，公开出现在留言板。可以只是一个近况、一个问题，或一句想被看见的话。",
    "guide.step2Title": "漂流",
    "guide.step2Body": "抽一个陌生问题，写一句匿名回答。答完可以继续换一个，不需要解释太多。",
    "guide.step3Title": "我的",
    "guide.step3Body": "这里可以查看当前设备里保存过的问题、回复和留言。没有账号，也不会同步到其他设备。",
    "guide.step4Title": "翻译",
    "guide.step4Body": "现在只是预留入口。不会调用翻译 API，也不会产生额外成本。",
    "guide.step5Title": "主题",
    "guide.step5Body": "设置里可以切换夜间、日间、青草、橘子、海洋、树木和彩虹。选择会留在当前浏览器。",
    "guide.step6Title": "语言",
    "guide.step6Body": "设置里可以切换中文和 English。选择会保存在当前浏览器。",
    "guide.step7Title": "收藏",
    "guide.step7Body": "看到想稍后再读的内容，可以先收藏；也可以让它重新漂流。收藏只保存在这台设备里。",
    "guide.step8Title": "意见箱",
    "guide.step8Body": "遇到问题、想提建议，去底部 dock 或左侧菜单里的意见箱。内容只给开发者查看。",
    "guide.step9Title": "安静模式",
    "guide.step9Body": "安静模式会降低页面的提示感和信息密度，让浏览节奏慢一点。",
    "guide.step10Title": "桌面端",
    "guide.step10Body": "桌面端有较多柔和过渡。如果感觉交互反馈慢半拍，请稍等片刻，通常是内容和动效还在完成加载。",
    "translation.eyebrow": "翻译",
    "translation.title": "实时翻译（Beta）",
    "translation.developing": "开发中",
    "translation.wait": "敬请期待",
    "empty.board": "还没有留言。你可以先发一条。",
    "empty.filtered": "没有符合当前条件的留言。",
    "empty.saved": "还没有本地收藏。",
    "empty.savedLong": "还没有本地收藏。看到想稍后再读的内容，可以先收藏。",
    "empty.loadingLocal": "正在读取这个浏览器里的内容。",
    "empty.localMissingTitle": "当前打开的这个网址里没有读取到本地内容。",
    "empty.localMissingBody": "本地记录只保存在当时使用的同一浏览器和同一个网站地址里。预览地址、localhost 和正式网站不会共享。只有曾经保存在这个浏览器里的内容或私人链接，才能在这里继续查看。",
    "rhythm.late": "深夜很安静，页面会少一点催促。",
    "rhythm.morning": "上午适合慢慢整理新内容。",
    "rhythm.day": "白天内容密度稍高，适合浏览和回应。",
    "rhythm.evening": "晚上适合让旧内容重新浮现。",
    "status.quietOn": "已进入安静模式。",
    "status.quietOff": "已恢复正常节奏。",
    "status.noMessages": "当前没有可查看的留言。",
    "status.resurfaced": "这条内容重新浮现了。",
    "status.saved": "已保存到本地收藏。",
    "status.unsaved": "已取消本地收藏。",
    "summary.local": "{questions} 条本地问题 · {saved} 条收藏 · {hidden} 条已隐藏",
    "saved.savedAt": "收藏于 {savedAt}",
    "saved.originalAt": " · 原文 {createdAt}",
    "mine.questions": "我的问题",
    "mine.answers": "我的回答",
    "mine.messages": "我的留言",
    "mine.localLinks": "本地保存的私人链接",
    "empty.none": "暂无内容。"
  },
  en: {
    "app.title": "Anonymous Bottle",
    "app.eyebrow": "Anonymous notes · question bottle",
    "app.intro": "Leave a short anonymous note, or send a question for someone to answer. No account. No names.",
    "app.privacy": "No account is used here. Other visitors will not see who wrote something. A local browser token helps keep your own content together. Please do not submit sensitive personal information; hosting and database services may still keep technical logs.",
    "update.text": "Strengthens the Day glass layer, fixes mobile Rainbow gradients, and expands the FAQ.",
    "theme.night": "Night",
    "theme.day": "Day",
    "theme.grass": "Grass",
    "theme.orange": "Orange",
    "theme.ocean": "Ocean",
    "theme.tree": "Tree",
    "theme.rainbow": "Rainbow",
    "nav.board": "Board",
    "nav.ask": "Ask",
    "nav.answer": "Drift",
    "nav.check": "Replies",
    "nav.mine": "My content",
    "nav.saved": "Saved",
    "nav.more": "More",
    "nav.feedback": "Feedback",
    "dock.board": "Notes",
    "dock.answer": "Drift",
    "dock.ask": "Ask",
    "dock.mine": "Mine",
    "dock.saved": "Saved",
    "dock.feedback": "Feedback",
    "dock.more": "More",
    "dock.settings": "Settings",
    "tips.title": "Tips",
    "settings.eyebrow": "Settings",
    "settings.title": "Settings",
    "settings.appearance": "Appearance",
    "faq.title": "FAQ",
    "faq.vpnQuestion": "Why might I need a VPN?",
    "faq.vpnAnswer": "The site is hosted on overseas services, so access speed can vary by network. If it does not open, another network or a stable proxy may help.",
    "faq.copyQuestion": "What can a public board link do?",
    "faq.copyAnswer": "It opens a specific public note, so you can return later or show someone the same item. Private links are still only for checking your own replies.",
    "faq.privateQuestion": "How are private links different from public links?",
    "faq.privateAnswer": "Private links are for checking replies to your own questions. Public links point to one public board item. Please do not treat private links as public display links.",
    "faq.localQuestion": "Can I recover content after changing phones or clearing the browser?",
    "faq.localAnswer": "Local records depend on this browser's saved token and history links. Changing devices, clearing storage, or using private browsing can lose the local index, so keep important content yourself.",
    "faq.pollQuestion": "When will polls open?",
    "faq.pollAnswer": "The frontend is ready, but the database migration still needs to be applied manually. Until then, the page will not try to load poll data.",
    "siteInfo.title": "Site Info",
    "siteInfo.project": "This anonymous space was made by Figaro using OpenAI tools, with all programming work completed by AI.",
    "siteInfo.author": "Author",
    "siteInfo.copyright": "© Figaro. The content and interface are still being maintained and experimented with; please do not copy it as a misleading service with the same identity.",
    "siteInfo.privacy": "The site is designed around anonymous use: there is no account system, ordinary anonymous content is not connected to real identity, and owner tokens used for local recovery are hashed in the browser before submission. The developer generally cannot identify specific visitors from normal anonymous flows. Still, no online system can promise absolute anonymity; hosting, database, and network providers may process requests. If illegal abuse appears in the future, light moderation may be needed.",
    "stage.current": "Current space",
    "actions.random": "Random",
    "actions.resurface": "Resurface",
    "actions.quiet": "Quiet",
    "actions.restore": "Restore",
    "actions.translate": "Translate",
    "actions.publish": "Post",
    "actions.randomOne": "Random note",
    "actions.refresh": "Refresh",
    "actions.createLink": "Create private link",
    "actions.copy": "Copy",
    "actions.drawQuestion": "Draw a question",
    "actions.nextQuestion": "Another one",
    "actions.sendAnswer": "Send answer",
    "actions.viewReplies": "View replies",
    "actions.submit": "Submit",
    "actions.save": "Save",
    "actions.saved": "Saved",
    "actions.like": "Like",
    "actions.liked": "Liked",
    "actions.replyOpen": "Show replies",
    "actions.replyClose": "Hide replies",
    "actions.copyLink": "Copy link",
    "actions.hide": "Hide",
    "actions.edit": "Edit",
    "actions.delete": "Delete",
    "actions.expand": "Read more",
    "actions.collapse": "Collapse",
    "actions.openSaved": "Open again",
    "actions.removeSaved": "Remove",
    "kind.qa": "Public Q&A",
    "kind.saved": "Saved",
    "board.title": "Public Board",
    "board.description": "Short anonymous notes shown publicly. Ask, greet, or leave a small moment.",
    "board.inputLabel": "Public anonymous note",
    "board.placeholder": "For example: Is anyone else waiting for a message?",
    "board.messages": "Notes",
    "controls.filter": "Filter",
    "controls.sort": "Sort",
    "controls.type": "Type",
    "filter.default": "All",
    "filter.unanswered": "No replies",
    "filter.related": "Related to me",
    "filter.questions": "Public Q&A",
    "filter.messages": "Notes only",
    "filter.polls": "Polls",
    "questionType.all": "All",
    "questionType.life": "Life",
    "questionType.relationships": "Relationships",
    "questionType.memory": "Memory",
    "questionType.mood": "Mood",
    "questionType.study": "Study",
    "questionType.ai": "AI",
    "questionType.other": "Other",
    "sort.newest": "Newest",
    "sort.replied": "Recently replied",
    "sort.oldest": "Oldest",
    "sort.liked": "Most liked",
    "sort.recommended": "Balanced",
    "ask.title": "Leave a question",
    "ask.description": "Send a question to someone passing by. Save the link to check replies later.",
    "ask.inputLabel": "Your question",
    "ask.placeholder": "For example: How would you think about this?",
    "ask.publicConsent": "If someone answers, and they also agree, this anonymous Q&A may appear publicly.",
    "ask.saveLink": "Save this private link",
    "ask.saveLinkHint": "Use this link or token later to read replies.",
    "ask.noAccountHint": "There is no account system, so keep the link somewhere safe.",
    "answer.title": "Answer a stranger",
    "answer.description": "Draw a question someone left. A short answer is enough.",
    "answer.empty": "Use the button below to draw a question.",
    "answer.selfHint": "There is no account system, so you may draw your own anonymous question. Draw again if that happens.",
    "answer.pool": "Question pool",
    "answer.poolAll": "All questions",
    "answer.poolSeed": "Seed only",
    "answer.poolUser": "User questions",
    "answer.seedNotice": "Seed questions may be added over time; answers appear publicly on the board.",
    "answer.inputLabel": "Your anonymous answer",
    "answer.placeholder": "Write your answer.",
    "answer.publicConsent": "If the asker also agrees, this anonymous Q&A may appear publicly.",
    "check.title": "Check my replies",
    "check.description": "Paste your private link, or enter the token at the end of it.",
    "check.inputLabel": "Private link or token",
    "check.placeholder": "For example: https://.../?token=abc or abc",
    "mine.title": "My content",
    "mine.description": "If this browser has local records, you can see your questions, replies, and notes here.",
    "saved.title": "Local saves",
    "saved.description": "Saved only in this browser. Reopen or resurface later.",
    "more.title": "More",
    "more.description": "Small experimental features that should not crowd the main space will live here first.",
    "more.feedback": "Go to Feedback",
    "more.settings": "Open Settings",
    "more.pollsLater": "Polls are parked here and will open after the backend database migration is approved.",
    "poll.title": "Anonymous polls",
    "poll.description": "Create a small poll with 2 to 4 options. It can open after the database migration is approved and applied.",
    "poll.questionLabel": "Poll question",
    "poll.questionPlaceholder": "For example: What would you rather do tonight?",
    "poll.optionPlaceholder1": "Option 1",
    "poll.optionPlaceholder2": "Option 2",
    "poll.optionPlaceholder3": "Option 3 (optional)",
    "poll.optionPlaceholder4": "Option 4 (optional)",
    "poll.keepPublic": "Keep public results after ending.",
    "poll.localHint": "No email, phone, or login is used; this browser token prevents repeat votes.",
    "poll.create": "Create poll",
    "poll.refresh": "Refresh polls",
    "poll.loading": "Reading polls.",
    "poll.empty": "No active polls yet.",
    "poll.missing": "Polls need the 6.0 database migration first.",
    "poll.vote": "Vote",
    "poll.voted": "Voted",
    "poll.total": "{count} votes",
    "poll.alreadyVoted": "This device has already voted.",
    "poll.end": "End poll",
    "poll.closed": "Ended",
    "feedback.title": "Feedback",
    "feedback.description": "Leave anonymous feedback, issues, or ideas. It is only for the developer and will not appear on the board.",
    "feedback.type": "Type",
    "feedback.kindFeedback": "Feedback",
    "feedback.kindProblem": "Problem",
    "feedback.kindIdea": "Idea",
    "feedback.kindOther": "Other",
    "feedback.inputLabel": "Content",
    "feedback.placeholder": "Write what happened, or what you hope this site can become.",
    "feedback.note": "This is not a public comment area or a support system. Please do not leave sensitive personal information.",
    "guide.entry": "Read guide",
    "guide.eyebrow": "Guide",
    "guide.title": "Use it gently",
    "guide.step1Title": "Notes",
    "guide.step1Body": "Write a short note for the public board. It can be a small update, a question, or one sentence you want someone to see.",
    "guide.step2Title": "Drift",
    "guide.step2Body": "Draw a stranger's question and leave a short anonymous answer. You can move on whenever you want.",
    "guide.step3Title": "Mine",
    "guide.step3Body": "Use this area to see questions, replies, and notes saved on this device. There is no account and no sync across devices.",
    "guide.step4Title": "Translate",
    "guide.step4Body": "This is only a placeholder for now. No translation API is called, and no extra cost is created.",
    "guide.step5Title": "Themes",
    "guide.step5Body": "Use Settings to switch Night, Day, Grass, Orange, Ocean, Tree, and Rainbow. The choice stays in this browser.",
    "guide.step6Title": "Language",
    "guide.step6Body": "Use Settings to switch Chinese and English. The choice is saved in this browser.",
    "guide.step7Title": "Saved",
    "guide.step7Body": "Save anything you may want to read later, or let it resurface. Saves stay only on this device.",
    "guide.step8Title": "Feedback",
    "guide.step8Body": "If something feels wrong or you have a suggestion, use Feedback in the dock or side menu. It is only shown to the developer.",
    "guide.step9Title": "Quiet mode",
    "guide.step9Body": "Quiet mode lowers prompts and visual density, so the page feels slower and calmer.",
    "guide.step10Title": "Desktop",
    "guide.step10Body": "Desktop uses several soft transitions. If feedback feels a little late, wait a moment; content and motion may still be settling.",
    "translation.eyebrow": "Translate",
    "translation.title": "Live Translation (Beta)",
    "translation.developing": "In development",
    "translation.wait": "Coming later",
    "empty.board": "No notes yet. You can write the first one.",
    "empty.filtered": "No notes match this view.",
    "empty.saved": "No local saves yet.",
    "empty.savedLong": "No local saves yet. Save something you may want to read again.",
    "empty.loadingLocal": "Reading local records in this browser.",
    "empty.localMissingTitle": "This address has not found any local content.",
    "empty.localMissingBody": "Local records are saved only in the same browser and the same website address used at the time. Preview addresses, localhost, and the production site do not share them. Only content or private links previously saved in this browser can continue here.",
    "rhythm.late": "Late night is quiet. The page will ask for less.",
    "rhythm.morning": "Morning is good for gently sorting new things.",
    "rhythm.day": "Daytime keeps a little more density for browsing and replying.",
    "rhythm.evening": "Evening is good for bringing old notes back.",
    "status.quietOn": "Quiet mode is on.",
    "status.quietOff": "Normal rhythm is back.",
    "status.noMessages": "There is nothing to view here yet.",
    "status.resurfaced": "This note has resurfaced.",
    "status.saved": "Saved locally.",
    "status.unsaved": "Removed from local saves.",
    "summary.local": "{questions} local questions · {saved} saved · {hidden} hidden",
    "saved.savedAt": "Saved {savedAt}",
    "saved.originalAt": " · original {createdAt}",
    "mine.questions": "My questions",
    "mine.answers": "My answers",
    "mine.messages": "My notes",
    "mine.localLinks": "Local private links",
    "empty.none": "Nothing here yet."
  }
};

const statusEl = document.querySelector("#status");
const siteNote = document.querySelector("#site-note");
const views = [...document.querySelectorAll(".panel")];
const viewButtons = [...document.querySelectorAll("[data-view]")];
const themeButtons = [...document.querySelectorAll("[data-theme-choice]")];
const themeMenu = document.querySelector(".theme-menu");
const themeTrigger = document.querySelector("#theme-trigger");
const themePopover = document.querySelector("#theme-popover");
const currentThemeLabel = document.querySelector(".current-theme-label");
const languageButtons = [...document.querySelectorAll("[data-language-choice]")];
const languageMenu = document.querySelector(".language-menu");
const languageTrigger = document.querySelector("#language-trigger");
const languagePopover = document.querySelector("#language-popover");
const currentLanguageLabel = document.querySelector(".current-language-label");
const rhythmNote = document.querySelector("#rhythm-note");
const localSummary = document.querySelector("#local-summary");
const stageTitle = document.querySelector("#stage-title");
const floatRandomMessageButton = document.querySelector("#float-random-message");
const resurfaceContentButton = document.querySelector("#resurface-content");
const quietToggle = document.querySelector("#quiet-toggle");
const openGuideButton = document.querySelector("#open-guide");
const openTranslationButton = document.querySelector("#open-translation");
const openSettingsButtons = [...document.querySelectorAll("#open-settings, #dock-open-settings, #more-open-settings")];
const guideSheet = document.querySelector("#guide-sheet");
const translationSheet = document.querySelector("#translation-sheet");
const settingsSheet = document.querySelector("#settings-sheet");

const publicMessageForm = document.querySelector("#public-message-form");
const publicMessageText = document.querySelector("#public-message-text");
const publicMessageList = document.querySelector("#public-message-list");
const publicMessageFilter = document.querySelector("#public-message-filter");
const publicMessageSort = document.querySelector("#public-message-sort");
const questionTypeFilter = document.querySelector("#question-type-filter");
const boardPollList = document.querySelector("#board-poll-list");
const randomPublicMessageButton = document.querySelector("#random-public-message");
const restoreHiddenMessagesButton = document.querySelector("#restore-hidden-messages");
const refreshMessagesButton = document.querySelector("#refresh-messages");

const questionForm = document.querySelector("#question-form");
const questionText = document.querySelector("#question-text");
const questionPublicConsent = document.querySelector("#question-public-consent");
const claimResult = document.querySelector("#claim-result");
const claimLink = document.querySelector("#claim-link");
const copyClaimLink = document.querySelector("#copy-claim-link");

const loadQuestionButton = document.querySelector("#load-question");
const skipQuestionButton = document.querySelector("#skip-question");
const questionPoolFilter = document.querySelector("#question-pool-filter");
const answerQuestionTypeFilter = document.querySelector("#answer-question-type-filter");
const randomQuestionCard = document.querySelector("#random-question-card");
const answerForm = document.querySelector("#answer-form");
const answerText = document.querySelector("#answer-text");
const answerPublicConsent = document.querySelector("#answer-public-consent");
const answerPublicConsentLine = answerPublicConsent?.closest(".check-line");
const answerPublicConsentText = document.querySelector("#answer-public-consent-text");
const seedQuestionNotice = document.querySelector("#seed-question-notice");

const checkForm = document.querySelector("#check-form");
const claimToken = document.querySelector("#claim-token");
const replyList = document.querySelector("#reply-list");
const myContent = document.querySelector("#my-content");
const savedContent = document.querySelector("#saved-content");

const feedbackForm = document.querySelector("#feedback-form");
const feedbackKind = document.querySelector("#feedback-kind");
const feedbackText = document.querySelector("#feedback-text");
const pollForm = document.querySelector("#poll-form");
const pollQuestion = document.querySelector("#poll-question");
const pollOptionInputs = [...document.querySelectorAll(".poll-option-input")];
const pollKeepPublic = document.querySelector("#poll-keep-public");
const pollList = document.querySelector("#poll-list");
const refreshPollsButton = document.querySelector("#more-refresh-polls");
const disabledPollNote = document.querySelector(".disabled-feature-note");
const pollPanel = document.querySelector(".poll-panel");
const pollFilterOption = document.querySelector('option[value="poll_posts"]');

init();

async function init() {
  initLanguage();
  initTheme();
  initQuietMode();
  renderRhythmState();
  bindNavigation();
  bindCounters();
  configurePollVisibility();
  bindForms();
  renderSiteNote();
  renderSeedQuestionNotice();
  openTokenFromUrl();
  state.linkedPublicMessageId = getLinkedPublicMessageId();
  await loadConfig();

  if (!window.supabase || !isConfigured()) {
    setStatus("服务暂时不可用，请稍后再试。", true);
    return;
  }

  if (!crypto?.subtle) {
    setStatus("当前页面需要 HTTPS 或 localhost，才能安全生成私人 token。", true);
    return;
  }

  state.hadStoredVisitorToken = hasStoredVisitorToken();
  state.visitorToken = getVisitorToken();
  state.ownerTokenHash = await sha256(state.visitorToken);
  state.hiddenPublicMessageIds = getHiddenPublicMessageIds();
  state.savedMessages = getSavedMessages();
  state.client = window.supabase.createClient(
    config.supabaseUrl,
    config.supabaseAnonKey
  );
  await loadPublicMessages();
  if (POLLS_FRONTEND_ENABLED) await loadPolls();
  updateLocalSummary();
}

function configurePollVisibility() {
  if (disabledPollNote) disabledPollNote.hidden = POLLS_FRONTEND_ENABLED;
  if (pollPanel) pollPanel.hidden = !POLLS_FRONTEND_ENABLED;
  if (refreshPollsButton) {
    refreshPollsButton.hidden = !POLLS_FRONTEND_ENABLED;
    refreshPollsButton.disabled = !POLLS_FRONTEND_ENABLED;
  }
  if (boardPollList) boardPollList.hidden = !POLLS_FRONTEND_ENABLED;
  if (pollFilterOption) {
    pollFilterOption.hidden = !POLLS_FRONTEND_ENABLED;
    pollFilterOption.disabled = !POLLS_FRONTEND_ENABLED;
  }
}

function t(key) {
  return I18N[state.language]?.[key] || I18N.zh[key] || key;
}

function formatText(key, values = {}) {
  return t(key).replace(/\{(\w+)\}/g, (_, name) => values[name] ?? "");
}

function initLanguage() {
  const savedLanguage = localStorage.getItem(LANGUAGE_KEY);
  state.language = savedLanguage === "en" ? "en" : "zh";
  applyTranslations();
}

function setLanguage(language) {
  state.language = language === "en" ? "en" : "zh";
  localStorage.setItem(LANGUAGE_KEY, state.language);
  closeLanguageMenu();
  applyTranslations();
  renderSiteNote();
  renderRhythmState();
  updateLocalSummary();
  updateThemeLabel(document.documentElement.dataset.theme || "night");
  renderCurrentPublicMessages();
  if (document.querySelector("#saved")?.classList.contains("is-active")) {
    renderSavedContent();
  }
  if (document.querySelector("#mine")?.classList.contains("is-active") && state.client) {
    loadMyContent();
  }
}

function applyTranslations() {
  document.documentElement.lang = state.language === "en" ? "en" : "zh-Hans";
  document.title = t("app.title");
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => {
    element.placeholder = t(element.dataset.i18nPlaceholder);
  });
  languageButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.languageChoice === state.language);
  });
  if (currentLanguageLabel) currentLanguageLabel.textContent = state.language === "en" ? "EN" : "中";
  if (languageTrigger) languageTrigger.setAttribute("aria-label", state.language === "en" ? "Language" : "语言");
  updateThemeLabel(document.documentElement.dataset.theme || "night");
  if (quietToggle) quietToggle.textContent = state.quietMode ? t("actions.restore") : t("actions.quiet");
}

async function loadConfig() {
  if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
    config = {
      ...config,
      supabaseUrl: toSupabaseProjectUrl(window.SUPABASE_URL),
      supabaseAnonKey: window.SUPABASE_ANON_KEY,
      maxAnswersPerQuestion: config.maxAnswersPerQuestion || 5
    };
    window.BOTTLE_CONFIG = config;
  }

  if (isConfigured()) return;

  try {
    const response = await fetch("/api/config", {
      headers: { accept: "application/json" }
    });
    if (!response.ok) return;

    const runtimeConfig = await response.json();
    config = {
      ...config,
      ...runtimeConfig
    };
    window.BOTTLE_CONFIG = config;
  } catch {
    // Local static development can use config.js instead.
  }
}

function toSupabaseProjectUrl(url) {
  return url.replace(/\/rest\/v1\/?$/, "");
}

function isConfigured() {
  return (
    config.supabaseUrl &&
    config.supabaseAnonKey &&
    !config.supabaseUrl.includes("YOUR-PROJECT") &&
    !config.supabaseAnonKey.includes("YOUR-SUPABASE")
  );
}

function bindNavigation() {
  viewButtons.forEach((button) => {
    button.addEventListener("click", () => showView(button.dataset.view));
  });
  showView("board");
}

function showView(id) {
  views.forEach((view) => view.classList.toggle("is-active", view.id === id));
  viewButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === id);
  });
  if (stageTitle) {
    const activeButton = viewButtons.find((button) => button.dataset.view === id);
    stageTitle.textContent = activeButton?.textContent?.trim() || t("nav.board");
  }
  setStatus("");
  if (id === "mine" && state.client) loadMyContent();
  if (id === "saved") renderSavedContent();
}

function bindCounters() {
  document.querySelectorAll("[data-counter-for]").forEach((counter) => {
    const input = document.querySelector(`#${counter.dataset.counterFor}`);
    if (!input) return;
    const render = () => {
      counter.textContent = `${input.value.length} / ${input.maxLength}`;
    };
    input.addEventListener("input", render);
    render();
  });
}

function bindForms() {
  publicMessageForm.addEventListener("submit", submitPublicMessage);
  publicMessageFilter?.addEventListener("change", handlePublicFilterChange);
  publicMessageSort?.addEventListener("change", handlePublicSortChange);
  questionTypeFilter?.addEventListener("change", handleQuestionTypeFilterChange);
  randomPublicMessageButton?.addEventListener("click", showRandomPublicMessage);
  floatRandomMessageButton?.addEventListener("click", showRandomPublicMessage);
  resurfaceContentButton?.addEventListener("click", resurfaceLocalContent);
  quietToggle?.addEventListener("click", toggleQuietMode);
  openGuideButton?.addEventListener("click", () => openSheet(guideSheet));
  openTranslationButton?.addEventListener("click", () => openSheet(translationSheet));
  openSettingsButtons.forEach((button) => {
    button?.addEventListener("click", () => openSheet(settingsSheet));
  });
  themeTrigger?.addEventListener("click", (event) => {
    event.stopPropagation();
    closeLanguageMenu();
    toggleThemeMenu();
  });
  languageTrigger?.addEventListener("click", (event) => {
    event.stopPropagation();
    closeThemeMenu();
    toggleLanguageMenu();
  });
  document.addEventListener("click", (event) => {
    if (!languageMenu?.contains(event.target)) closeLanguageMenu();
    if (!themeMenu?.contains(event.target)) closeThemeMenu();
  });
  document.querySelectorAll("[data-close-sheet]").forEach((button) => {
    button.addEventListener("click", () => closeSheets());
  });
  document.querySelectorAll(".sheet-backdrop").forEach((sheet) => {
    sheet.addEventListener("click", (event) => {
      if (event.target === sheet) closeSheets();
    });
  });
  languageButtons.forEach((button) => {
    button.addEventListener("click", () => setLanguage(button.dataset.languageChoice));
  });
  restoreHiddenMessagesButton?.addEventListener("click", restoreHiddenPublicMessages);
  refreshMessagesButton.addEventListener("click", loadPublicMessages);
  publicMessageList.addEventListener("click", handlePublicMessageClick);
  publicMessageList.addEventListener("submit", submitPublicReply);
  if (POLLS_FRONTEND_ENABLED) {
    boardPollList?.addEventListener("click", handlePollClick);
  }
  replyList.addEventListener("click", handleReplyListClick);
  replyList.addEventListener("submit", submitAskerReply);
  myContent.addEventListener("click", handleMyContentClick);
  savedContent?.addEventListener("click", handleSavedContentClick);
  questionForm.addEventListener("submit", submitQuestion);
  questionPoolFilter?.addEventListener("change", handleQuestionPoolFilterChange);
  answerQuestionTypeFilter?.addEventListener("change", handleAnswerQuestionTypeFilterChange);
  loadQuestionButton.addEventListener("click", loadRandomQuestion);
  skipQuestionButton.addEventListener("click", loadRandomQuestion);
  answerForm.addEventListener("submit", submitAnswer);
  checkForm.addEventListener("submit", checkReplies);
  copyClaimLink.addEventListener("click", copyClaim);
  feedbackForm?.addEventListener("submit", submitSiteFeedback);
  if (POLLS_FRONTEND_ENABLED) {
    pollForm?.addEventListener("submit", submitPoll);
    pollList?.addEventListener("click", handlePollClick);
    refreshPollsButton?.addEventListener("click", loadPolls);
  }
  themeButtons.forEach((button) => {
    button.addEventListener("click", () => setTheme(button.dataset.themeChoice));
  });
}

function initQuietMode() {
  state.quietMode = localStorage.getItem(QUIET_MODE_KEY) === "true";
  document.documentElement.classList.toggle("quiet-mode", state.quietMode);
  if (quietToggle) quietToggle.textContent = state.quietMode ? t("actions.restore") : t("actions.quiet");
}

function toggleQuietMode() {
  state.quietMode = !state.quietMode;
  localStorage.setItem(QUIET_MODE_KEY, String(state.quietMode));
  document.documentElement.classList.toggle("quiet-mode", state.quietMode);
  if (quietToggle) quietToggle.textContent = state.quietMode ? t("actions.restore") : t("actions.quiet");
  setStatus(state.quietMode ? t("status.quietOn") : t("status.quietOff"));
}

function openSheet(sheet) {
  if (!sheet) return;
  sheet.hidden = false;
  requestAnimationFrame(() => sheet.classList.add("is-open"));
}

function toggleThemeMenu() {
  if (!themePopover || !themeTrigger) return;
  const shouldOpen = themePopover.hidden;
  themePopover.hidden = !shouldOpen;
  themeTrigger.setAttribute("aria-expanded", String(shouldOpen));
  themeMenu?.classList.toggle("is-open", shouldOpen);
}

function closeThemeMenu() {
  if (!themePopover || !themeTrigger) return;
  themePopover.hidden = true;
  themeTrigger.setAttribute("aria-expanded", "false");
  themeMenu?.classList.remove("is-open");
}

function toggleLanguageMenu() {
  if (!languagePopover || !languageTrigger) return;
  const shouldOpen = languagePopover.hidden;
  languagePopover.hidden = !shouldOpen;
  languageTrigger.setAttribute("aria-expanded", String(shouldOpen));
  languageMenu?.classList.toggle("is-open", shouldOpen);
}

function closeLanguageMenu() {
  if (!languagePopover || !languageTrigger) return;
  languagePopover.hidden = true;
  languageTrigger.setAttribute("aria-expanded", "false");
  languageMenu?.classList.remove("is-open");
}

function closeSheets() {
  document.querySelectorAll(".sheet-backdrop.is-open").forEach((sheet) => {
    sheet.classList.remove("is-open");
    window.setTimeout(() => {
      sheet.hidden = true;
    }, 420);
  });
}

function renderRhythmState() {
  if (!rhythmNote) return;

  const hour = new Date().getHours();
  const rhythm =
    hour < 6
      ? t("rhythm.late")
      : hour < 11
        ? t("rhythm.morning")
        : hour < 18
          ? t("rhythm.day")
          : t("rhythm.evening");
  document.documentElement.dataset.rhythm =
    hour < 6 ? "late" : hour < 11 ? "morning" : hour < 18 ? "day" : "evening";
  rhythmNote.textContent = rhythm;
}

function initTheme() {
  setTheme(localStorage.getItem(THEME_KEY) || "night", false);
}

function setTheme(theme, shouldPersist = true) {
  const safeTheme = ["night", "day", "grass", "orange", "ocean", "tree", "rainbow"].includes(
    theme
  )
    ? theme
    : "night";
  const isChanging = document.documentElement.dataset.theme && document.documentElement.dataset.theme !== safeTheme;
  if (isChanging) {
    document.documentElement.classList.remove("theme-transitioning");
    window.requestAnimationFrame(() => {
      document.documentElement.classList.add("theme-transitioning");
      window.setTimeout(() => {
        document.documentElement.classList.remove("theme-transitioning");
      }, 1120);
    });
  }
  document.documentElement.dataset.theme = safeTheme;
  themeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.themeChoice === safeTheme);
  });
  updateThemeLabel(safeTheme);
  closeThemeMenu();
  if (shouldPersist) localStorage.setItem(THEME_KEY, safeTheme);
}

function updateThemeLabel(theme) {
  const safeTheme = ["night", "day", "grass", "orange", "ocean", "tree", "rainbow"].includes(theme)
    ? theme
    : "night";
  if (currentThemeLabel) currentThemeLabel.textContent = t(`theme.${safeTheme}`);
  if (themeTrigger) themeTrigger.setAttribute("aria-label", t(`theme.${safeTheme}`));
}

function openTokenFromUrl() {
  const token = new URLSearchParams(window.location.search).get("token");
  if (!token) return;

  claimToken.value = token;
  showView("check");
}

async function submitPublicMessage(event) {
  event.preventDefault();
  if (!state.client) return setStatus("服务暂时不可用，请稍后再试。", true);

  const text = normalizeText(publicMessageText.value);
  const validation = validateText(text, 2, 280);
  if (!validation.ok) return setStatus(validation.message, true);

  await withBusy(publicMessageForm, async () => {
    const { error } = await state.client.rpc("submit_public_message", {
      message_body: text,
      owner_token_hash_value: state.ownerTokenHash
    });

    if (error) throw error;
    publicMessageForm.reset();
    updateAllCounters();
    state.hadStoredVisitorToken = true;
    setStatus("留言已发布。");
    await loadPublicMessages();
  });
}

async function submitSiteFeedback(event) {
  event.preventDefault();
  if (!state.client) return setStatus("服务暂时不可用，请稍后再试。", true);

  const text = normalizeText(feedbackText.value);
  const validation = validateText(text, 2, 1000);
  if (!validation.ok) return setStatus(validation.message, true);

  await withBusy(feedbackForm, async () => {
    const { error } = await state.client.rpc("submit_site_feedback", {
      feedback_kind_value: feedbackKind.value,
      feedback_body: text,
      owner_token_hash_value: state.ownerTokenHash
    });

    if (isMissingRpc(error)) {
      throw new Error("意见箱需要先更新数据库函数。");
    }

    if (error) throw error;
    feedbackForm.reset();
    updateAllCounters();
    setStatus("已收到。谢谢你留下这条反馈。");
  });
}

async function loadPolls() {
  if (!POLLS_FRONTEND_ENABLED) return;
  if (!state.client) return;

  const { data, error } = await state.client.rpc("get_public_polls", {
    owner_token_hash_value: state.ownerTokenHash
  });

  if (isMissingRpc(error)) {
    renderPolls([], { missing: true });
    return;
  }

  if (error) {
    renderPolls([], { error: error.message });
    return;
  }

  state.polls = data || [];
  renderPolls(state.polls);
}

async function submitPoll(event) {
  event.preventDefault();
  if (!state.client) return setStatus("服务暂时不可用，请稍后再试。", true);

  const question = normalizeQuestionText(pollQuestion.value);
  const options = pollOptionInputs
    .map((input) => normalizeText(input.value))
    .filter(Boolean)
    .slice(0, 4);
  const validation = validateText(question, 4, 160);
  if (!validation.ok) return setStatus(validation.message, true);
  if (options.length < 2) return setStatus("投票至少需要 2 个选项。", true);

  await withBusy(pollForm, async () => {
    const { error } = await state.client.rpc("create_poll", {
      question_body: question,
      option_bodies: options,
      owner_token_hash_value: state.ownerTokenHash,
      keep_public_after_end_value: pollKeepPublic.checked
    });

    if (isMissingRpc(error)) throw new Error(t("poll.missing"));
    if (error) throw error;
    pollForm.reset();
    pollKeepPublic.checked = true;
    setStatus("投票已创建。");
    await loadPolls();
    await loadPublicMessages();
  });
}

async function handlePollClick(event) {
  const button = event.target.closest("button[data-poll-action]");
  if (!button) return;

  const pollId = button.closest("[data-poll-id]")?.dataset.pollId;
  if (!pollId) return;

  if (button.dataset.pollAction === "vote") {
    await votePoll(pollId, button.dataset.optionId);
  }

  if (button.dataset.pollAction === "end") {
    await endPoll(pollId);
  }
}

async function votePoll(pollId, optionId) {
  if (!optionId) return;
  if (getLocalPollVotes()[pollId]) return setStatus(t("poll.alreadyVoted"), true);

  await withBusy(refreshPollsButton, async () => {
    const { error } = await state.client.rpc("vote_poll", {
      poll_public_id_value: pollId,
      option_public_id_value: optionId,
      owner_token_hash_value: state.ownerTokenHash
    });
    if (isMissingRpc(error)) throw new Error(t("poll.missing"));
    if (error) throw error;
    const votes = getLocalPollVotes();
    votes[pollId] = optionId;
    localStorage.setItem(POLL_VOTES_KEY, JSON.stringify(votes));
    setStatus("已投票。");
    await loadPolls();
  });
}

async function endPoll(pollId) {
  await withBusy(refreshPollsButton, async () => {
    const { error } = await state.client.rpc("end_poll", {
      poll_public_id_value: pollId,
      owner_token_hash_value: state.ownerTokenHash
    });
    if (isMissingRpc(error)) throw new Error(t("poll.missing"));
    if (error) throw error;
    setStatus("投票已结束。");
    await loadPolls();
    await loadPublicMessages();
  });
}

function renderPolls(polls, options = {}) {
  if (options.missing) {
    const html = `<article class="empty-state">${t("poll.missing")}</article>`;
    if (pollList) pollList.innerHTML = html;
    if (boardPollList) boardPollList.innerHTML = "";
    return;
  }

  if (options.error) {
    const html = `<article class="empty-state">${escapeHtml(options.error)}</article>`;
    if (pollList) pollList.innerHTML = html;
    if (boardPollList) boardPollList.innerHTML = "";
    return;
  }

  const activePolls = polls.filter((poll) => poll.is_active || poll.keep_public_after_end);
  const html = activePolls.length
    ? activePolls.map(renderPollCard).join("")
    : `<article class="empty-state">${t("poll.empty")}</article>`;
  if (pollList) pollList.innerHTML = html;
  if (boardPollList) {
    const boardPolls = activePolls.filter((poll) => poll.is_active).slice(0, 2);
    boardPollList.innerHTML = boardPolls.map(renderPollCard).join("");
  }
}

function renderPollCard(poll) {
  const localVote = getLocalPollVotes()[poll.public_id];
  const totalVotes = Number(poll.total_votes || 0);
  const options = Array.isArray(poll.options) ? poll.options : [];
  return `
    <article class="content-card poll-card${poll.is_active ? "" : " is-ended"}" data-poll-id="${escapeHtml(poll.public_id)}">
      <div class="message-topline">
        <p class="message-meta">${poll.is_active ? t("poll.title") : t("poll.closed")} · ${formatDate(poll.created_at)} · ${formatText("poll.total", { count: totalVotes })}</p>
        ${poll.owned_by_me && poll.is_active ? `<button class="secondary mini-button" data-poll-action="end" type="button">${t("poll.end")}</button>` : ""}
      </div>
      <p class="message-body">${escapeHtml(poll.question_text || "")}</p>
      <div class="poll-options-list">
        ${options.map((option) => {
          const count = Number(option.vote_count || 0);
          const percent = totalVotes ? Math.round((count / totalVotes) * 100) : 0;
          const voted = localVote === option.public_id;
          return `
            <button class="poll-option${voted ? " is-voted" : ""}" data-poll-action="vote" data-option-id="${escapeHtml(option.public_id)}" type="button" aria-pressed="${voted ? "true" : "false"}" ${poll.is_active && !localVote ? "" : "disabled"}>
              <span class="poll-option-label">${escapeHtml(option.option_text)}${voted ? ` · ${t("poll.voted")}` : ""}</span>
              <span class="poll-option-count">${count} · ${percent}%</span>
            </button>
          `;
        }).join("")}
      </div>
    </article>
  `;
}

async function loadPublicMessages() {
  if (!state.client) return;

  await withBusy(refreshMessagesButton, async () => {
    const { data, error } = await state.client.rpc("get_public_messages", {
      limit_count: 30,
      owner_token_hash_value: state.ownerTokenHash
    });

    if (error) throw error;
    state.publicMessages = data || [];
    renderCurrentPublicMessages();
    setStatus(state.publicMessages.length ? "" : "暂无公开留言。");
    window.setTimeout(focusLinkedPublicMessage, 0);
  });
}

function handlePublicFilterChange(event) {
  state.publicFilterMode = event.target.value;
  renderCurrentPublicMessages();
}

function handlePublicSortChange(event) {
  state.publicSortMode = event.target.value;
  renderCurrentPublicMessages();
}

function handleQuestionTypeFilterChange(event) {
  state.questionTypeFilter = event.target.value;
  renderCurrentPublicMessages();
}

function handleAnswerQuestionTypeFilterChange(event) {
  state.answerQuestionTypeFilter = event.target.value;
  state.currentQuestion = null;
  answerForm.hidden = true;
  skipQuestionButton.hidden = true;
  resetAnswerFormForQuestion();
  randomQuestionCard.innerHTML =
    '<p class="muted">点击下面的按钮抽取一个问题。</p>';
}

function renderCurrentPublicMessages() {
  const visibleMessages = sortPublicMessages(
    filterPublicMessagesByType(
      filterPublicMessages(
      state.publicMessages.filter((message) => !isPublicMessageHidden(message.public_id)),
      state.publicFilterMode
      ),
      state.questionTypeFilter
    ),
    state.publicSortMode
  );
  state.visiblePublicMessages = visibleMessages;
  updateHiddenMessagesControl();
  updateLocalSummary();
  renderPublicMessages(
    visibleMessages
  );
  if (document.querySelector("#saved")?.classList.contains("is-active")) {
    renderSavedContent();
  }
}

function filterPublicMessages(messages, filterMode) {
  if (filterMode === "unanswered_only") {
    return messages.filter((message) => Number(message.reply_count || 0) === 0);
  }

  if (filterMode === "related_to_me") {
    return messages.filter((message) => message.owned_by_me || message.liked_by_me);
  }

  if (filterMode === "public_questions") {
    return messages.filter((message) => message.message_kind === "bottle_qa");
  }

  if (filterMode === "message_posts") {
    return messages.filter((message) => message.message_kind !== "bottle_qa");
  }

  if (filterMode === "poll_posts") {
    return messages.filter((message) => message.message_kind === "poll");
  }

  return messages;
}

function filterPublicMessagesByType(messages, type) {
  if (!type || type === "all") return messages;
  return messages.filter((message) => classifyQuestionType(message.message_text || "") === type);
}

function questionMatchesSelectedType(text) {
  return state.answerQuestionTypeFilter === "all" ||
    classifyQuestionType(text || "") === state.answerQuestionTypeFilter;
}

function classifyQuestionType(text) {
  const value = String(text || "").toLowerCase();
  if (/(ai|chatgpt|openai|codex|模型|人工智能)/i.test(value)) return "ai";
  if (/(学习|考试|高考|作业|学校|大学|课程|专业|study|exam|school)/i.test(value)) return "study";
  if (/(关系|喜欢|朋友|恋|爱|联系|消息|回复|分手|家人|同学|relationship|friend|love)/i.test(value)) return "relationships";
  if (/(以前|小时候|高中|毕业|过去|回忆|记得|想起|从前|memory|remember)/i.test(value)) return "memory";
  if (/(难过|焦虑|开心|压力|情绪|累|孤独|害怕|心情|mood|feel|sad|happy)/i.test(value)) return "mood";
  if (/(吃|睡|外卖|房间|出门|周末|生活|今天|最近|日常|life|daily)/i.test(value)) return "life";
  return "other";
}

function sortPublicMessages(messages, sortMode) {
  const sortedMessages = [...messages];
  const createdAtTime = (message) => new Date(message.created_at || 0).getTime();
  const lastReplyAtTime = (message) => new Date(message.last_reply_at || 0).getTime();
  const likeCount = (message) => Number(message.like_count || 0);
  const replyCount = (message) => Number(message.reply_count || 0);
  const recommendedScore = (message) => {
    const ageHours = Math.max(0, (Date.now() - createdAtTime(message)) / 36e5);
    const recencyScore = 1 / (1 + ageHours / 24);
    return likeCount(message) * 3 + replyCount(message) + recencyScore * 2;
  };

  if (sortMode === "oldest_first") {
    return sortedMessages.sort((a, b) => createdAtTime(a) - createdAtTime(b));
  }

  if (sortMode === "most_liked") {
    return sortedMessages.sort((a, b) => {
      const likeDifference = likeCount(b) - likeCount(a);
      return likeDifference || createdAtTime(b) - createdAtTime(a);
    });
  }

  if (sortMode === "recently_replied") {
    const hasLastReplyAt = sortedMessages.some((message) => message.last_reply_at);
    if (hasLastReplyAt) {
      return sortedMessages.sort((a, b) => {
        const replyTimeDifference = lastReplyAtTime(b) - lastReplyAtTime(a);
        return replyTimeDifference || createdAtTime(b) - createdAtTime(a);
      });
    }

    return sortedMessages.sort((a, b) => {
      const replyDifference = replyCount(b) - replyCount(a);
      return replyDifference || createdAtTime(b) - createdAtTime(a);
    });
  }

  if (sortMode === "codex_recommended") {
    return sortedMessages.sort((a, b) => {
      const scoreDifference = recommendedScore(b) - recommendedScore(a);
      return scoreDifference || createdAtTime(b) - createdAtTime(a);
    });
  }

  return sortedMessages.sort((a, b) => createdAtTime(b) - createdAtTime(a));
}

function renderPublicMessages(messages) {
  if (!messages.length) {
    publicMessageList.innerHTML =
      `<article class="empty-state">${t("empty.filtered")}</article>`;
    return;
  }

  publicMessageList.innerHTML = messages.map(renderPublicMessageCard).join("");
}

function renderPublicMessageCard(message) {
  const body = message.message_text || "";
  const isLongBody = body.length > PUBLIC_MESSAGE_COLLAPSE_LENGTH;
  const replyCount = Number(message.reply_count || 0);
  const likeCount = Number(message.like_count || 0);
  const messageId = escapeHtml(message.public_id);
  const isSaved = isMessageSaved(message.public_id);
  const questionType = classifyQuestionType(body);

  return `
    <article class="message-card${isSaved ? " is-saved" : ""}" id="post-${messageId}" data-message-id="${messageId}">
      <div class="message-topline">
        <p class="message-meta">${formatDate(message.created_at)}${message.edited_at ? ` · 已编辑` : ""}</p>
        <span class="message-tags">
          ${message.message_kind === "bottle_qa" ? `<span class="message-kind">${t("kind.qa")}</span>` : ""}
          ${message.message_kind === "poll" ? `<span class="message-kind">${t("poll.title")}</span>` : ""}
          <span class="message-kind">${t(`questionType.${questionType}`)}</span>
          ${isSaved ? `<span class="message-kind">${t("kind.saved")}</span>` : ""}
        </span>
      </div>
      <p class="message-stats">
        <span class="reply-stat">${replyCount} 条回复</span>
        <span>${likeCount} 个喜欢</span>
      </p>
      <p class="message-body${isLongBody ? " is-collapsed" : ""}">${escapeHtml(body)}</p>
      ${isLongBody ? `<button class="text-button" data-action="toggle-message-body" type="button">${t("actions.expand")}</button>` : ""}
      <div class="message-actions">
        <button class="secondary mini-button" data-action="toggle-replies" type="button">${t("actions.replyOpen")}</button>
        <button class="secondary mini-button" data-action="like-message" type="button">${message.liked_by_me ? t("actions.liked") : t("actions.like")}</button>
        <button class="secondary mini-button" data-action="save-message" type="button">${isSaved ? t("actions.saved") : t("actions.save")}</button>
        <button class="secondary mini-button" data-action="redrift-message" type="button">${t("actions.resurface")}</button>
        <button class="secondary mini-button" data-action="translate-message" type="button">${t("actions.translate")}</button>
        <button class="secondary mini-button" data-action="copy-message-link" type="button">${t("actions.copyLink")}</button>
        <button class="secondary mini-button" data-action="hide-message" type="button">${t("actions.hide")}</button>
        ${message.owned_by_me ? `<button class="secondary mini-button" data-action="edit-message" type="button">${t("actions.edit")}</button><button class="secondary mini-button danger-button" data-action="delete-message" type="button">${t("actions.delete")}</button>` : ""}
      </div>
      <div class="inline-replies" hidden></div>
      <form class="reply-form" hidden>
        <label for="reply-${messageId}">匿名回复</label>
        <textarea id="reply-${messageId}" maxlength="500" placeholder="写一句回复。" required></textarea>
        <div class="form-row">
          <span class="small">最多 500 字</span>
          <button type="submit">发送回复</button>
        </div>
      </form>
    </article>
  `;
}

async function handlePublicMessageClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const card = button.closest("[data-message-id]");
  const messageId = card.dataset.messageId;

  if (button.dataset.action === "toggle-message-body") {
    togglePublicMessageBody(card, button);
  }

  if (button.dataset.action === "toggle-replies") {
    const replies = card.querySelector(".inline-replies");
    const form = card.querySelector(".reply-form");
    const shouldOpen = replies.hidden;

    replies.hidden = !shouldOpen;
    form.hidden = !shouldOpen;
    button.textContent = shouldOpen ? t("actions.replyClose") : t("actions.replyOpen");

    if (shouldOpen) await loadPublicReplies(messageId, replies);
  }

  if (button.dataset.action === "like-message") {
    await likePublicMessage(messageId);
  }

  if (button.dataset.action === "save-message") {
    toggleSavedMessage(messageId);
  }

  if (button.dataset.action === "redrift-message") {
    redriftMessage(messageId);
  }

  if (button.dataset.action === "translate-message") {
    openSheet(translationSheet);
  }

  if (button.dataset.action === "copy-message-link") {
    await copyPublicMessageLink(messageId);
  }

  if (button.dataset.action === "hide-message") {
    hidePublicMessage(messageId);
  }

  if (button.dataset.action === "edit-message") {
    await editPublicMessage(messageId);
  }

  if (button.dataset.action === "delete-message") {
    await deletePublicMessage(messageId);
  }
}

function togglePublicMessageBody(card, button) {
  const body = card.querySelector(".message-body");
  const isCollapsed = body.classList.toggle("is-collapsed");
  button.textContent = isCollapsed ? t("actions.expand") : t("actions.collapse");
}

async function copyPublicMessageLink(messageId) {
  const url = new URL(window.location.href);
  url.searchParams.delete("token");
  url.searchParams.set("post", messageId);
  url.hash = "";
  const link = url.toString();

  try {
    await navigator.clipboard.writeText(link);
    setStatus("链接已复制。");
  } catch {
    prompt("复制这条链接", link);
    setStatus("已生成链接，可手动复制。");
  }
}

function getSavedMessages() {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVED_MESSAGES_KEY) || "{}");
    return saved && typeof saved === "object" && !Array.isArray(saved) ? saved : {};
  } catch {
    return {};
  }
}

function getLocalPollVotes() {
  try {
    const votes = JSON.parse(localStorage.getItem(POLL_VOTES_KEY) || "{}");
    return votes && typeof votes === "object" && !Array.isArray(votes) ? votes : {};
  } catch {
    return {};
  }
}

function saveSavedMessages() {
  localStorage.setItem(SAVED_MESSAGES_KEY, JSON.stringify(state.savedMessages));
  updateLocalSummary();
}

function isMessageSaved(messageId) {
  return Boolean(state.savedMessages?.[messageId]);
}

function toggleSavedMessage(messageId) {
  const message = state.publicMessages.find((item) => item.public_id === messageId);
  if (!message) return setStatus("这条内容当前不可收藏。", true);

  if (isMessageSaved(messageId)) {
    delete state.savedMessages[messageId];
    setStatus(t("status.unsaved"));
  } else {
    state.savedMessages[messageId] = {
      public_id: message.public_id,
      message_text: message.message_text,
      message_kind: message.message_kind,
      created_at: message.created_at,
      saved_at: new Date().toISOString()
    };
    setStatus(t("status.saved"));
  }

  saveSavedMessages();
  renderCurrentPublicMessages();
}

function redriftMessage(messageId) {
  if (!focusPublicMessage(messageId)) return;
  const card = document.querySelector(`[data-message-id="${CSS.escape(messageId)}"]`);
  card?.classList.add("is-resurfaced");
  window.setTimeout(() => card?.classList.remove("is-resurfaced"), 2200);
  setStatus(t("status.resurfaced"));
}

function resurfaceLocalContent() {
  const savedItems = Object.values(state.savedMessages || {});
  const pool = savedItems.length ? savedItems : state.visiblePublicMessages;
  if (!pool.length) return setStatus("暂时没有可重新漂流的内容。", true);

  const oldest = [...pool].sort(
    (a, b) => new Date(a.saved_at || a.created_at || 0) - new Date(b.saved_at || b.created_at || 0)
  )[0];
  if (oldest?.public_id) {
    showView("board");
    window.setTimeout(() => redriftMessage(oldest.public_id), 0);
  }
}

function renderSavedContent() {
  if (!savedContent) return;

  const savedItems = Object.values(state.savedMessages || {}).sort(
    (a, b) => new Date(b.saved_at || 0) - new Date(a.saved_at || 0)
  );

  if (!savedItems.length) {
    savedContent.innerHTML =
      `<article class="empty-state">${t("empty.savedLong")}</article>`;
    return;
  }

  savedContent.innerHTML = savedItems
    .map((item) => `
      <article class="content-card saved-card" data-saved-message-id="${escapeHtml(item.public_id)}">
        <p class="message-meta">${formatText("saved.savedAt", { savedAt: formatDate(item.saved_at) })}${item.created_at ? formatText("saved.originalAt", { createdAt: formatDate(item.created_at) }) : ""}</p>
        <p class="message-body">${escapeHtml(item.message_text || "本地收藏内容")}</p>
        <div class="content-actions">
          <button class="secondary mini-button" data-action="open-saved-message" type="button">${t("actions.openSaved")}</button>
          <button class="secondary mini-button" data-action="remove-saved-message" type="button">${t("actions.removeSaved")}</button>
        </div>
      </article>
    `)
    .join("");
}

function handleSavedContentClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const card = button.closest("[data-saved-message-id]");
  const messageId = card?.dataset.savedMessageId;
  if (!messageId) return;

  if (button.dataset.action === "open-saved-message") {
    showView("board");
    window.setTimeout(() => redriftMessage(messageId), 0);
  }

  if (button.dataset.action === "remove-saved-message") {
    delete state.savedMessages[messageId];
    saveSavedMessages();
    renderSavedContent();
    renderCurrentPublicMessages();
    setStatus(t("status.unsaved"));
  }
}

function hidePublicMessage(messageId) {
  if (!state.hiddenPublicMessageIds.includes(messageId)) {
    state.hiddenPublicMessageIds = [...state.hiddenPublicMessageIds, messageId];
    saveHiddenPublicMessageIds();
  }
  renderCurrentPublicMessages();
  updateLocalSummary();
  setStatus("已在当前浏览器隐藏这条留言。");
}

function restoreHiddenPublicMessages() {
  state.hiddenPublicMessageIds = [];
  saveHiddenPublicMessageIds();
  renderCurrentPublicMessages();
  updateLocalSummary();
  setStatus("已恢复隐藏的留言。");
}

function showRandomPublicMessage() {
  if (!state.visiblePublicMessages.length) {
    return setStatus(t("status.noMessages"), true);
  }

  const message =
    state.visiblePublicMessages[
      Math.floor(Math.random() * state.visiblePublicMessages.length)
    ];
  focusPublicMessage(message.public_id);
}

function focusPublicMessage(messageId) {
  const card = [...publicMessageList.querySelectorAll("[data-message-id]")].find(
    (item) => item.dataset.messageId === messageId
  );

  if (!card) {
    setStatus("这条留言当前未显示。");
    return false;
  }

  card.scrollIntoView({ behavior: "smooth", block: "center" });
  card.classList.add("is-focused");
  window.setTimeout(() => {
    card.classList.remove("is-focused");
  }, PUBLIC_MESSAGE_FOCUS_MS);
  return true;
}

function getLinkedPublicMessageId() {
  const params = new URLSearchParams(window.location.search);
  const postId = params.get("post");
  if (postId) return postId;

  const hash = window.location.hash || "";
  return hash.startsWith("#post-") ? hash.slice(6) : "";
}

function focusLinkedPublicMessage() {
  if (!state.linkedPublicMessageId) return;

  const didFocus = focusPublicMessage(state.linkedPublicMessageId);
  state.linkedPublicMessageId = "";
  if (!didFocus) {
    setStatus("这条留言当前未显示，可调整筛选或恢复隐藏内容。");
  }
}

async function likePublicMessage(messageId) {
  await withBusy(refreshMessagesButton, async () => {
    const { error } = await state.client.rpc("like_public_message", {
      message_public_id_value: messageId,
      owner_token_hash_value: state.ownerTokenHash
    });
    if (error) throw error;
    await loadPublicMessages();
  });
}

async function editPublicMessage(messageId) {
  const current = state.publicMessages.find((message) => message.public_id === messageId);
  const nextText = prompt("修改留言", current?.message_text || "");
  if (nextText === null) return;

  const text = normalizeText(nextText);
  const validation = validateText(text, 2, 280);
  if (!validation.ok) return setStatus(validation.message, true);

  await withBusy(refreshMessagesButton, async () => {
    const { error } = await state.client.rpc("update_public_message", {
      message_public_id_value: messageId,
      owner_token_hash_value: state.ownerTokenHash,
      message_body: text
    });
    if (error) throw error;
    setStatus("留言已更新。");
    await loadPublicMessages();
  });
}

async function deletePublicMessage(messageId) {
  if (!confirm("删除这条留言？")) return;

  await withBusy(refreshMessagesButton, async () => {
    const { error } = await state.client.rpc("delete_public_message", {
      message_public_id_value: messageId,
      owner_token_hash_value: state.ownerTokenHash
    });
    if (error) throw error;
    setStatus("留言已删除。");
    await loadPublicMessages();
  });
}

async function loadPublicReplies(messageId, container) {
  container.innerHTML = '<p class="muted">正在加载回复...</p>';
  const { data, error } = await state.client.rpc("get_public_message_replies", {
    message_public_id_value: messageId
  });

  if (error) {
    container.innerHTML = `<p class="muted">${escapeHtml(error.message)}</p>`;
    return;
  }

  if (!data?.length) {
    container.innerHTML = '<p class="muted">还没有回复。</p>';
    return;
  }

  container.innerHTML = data
    .map(
      (reply) => `
        <div class="inline-reply">
          <p class="reply-meta">${formatDate(reply.created_at)}</p>
          <p>${escapeHtml(reply.reply_text)}</p>
        </div>
      `
    )
    .join("");
}

async function submitPublicReply(event) {
  event.preventDefault();
  if (!state.client) return setStatus("服务暂时不可用，请稍后再试。", true);

  const form = event.target;
  const card = form.closest("[data-message-id]");
  const messageId = card.dataset.messageId;
  const textarea = form.querySelector("textarea");
  const text = normalizeText(textarea.value);
  const validation = validateText(text, 1, 500);
  if (!validation.ok) return setStatus(validation.message, true);

  await withBusy(form, async () => {
    const { error } = await state.client.rpc("submit_public_message_reply", {
      message_public_id_value: messageId,
      reply_body: text
    });

    if (error) throw error;
    textarea.value = "";
    setStatus("回复已发送。");
    await loadPublicReplies(messageId, card.querySelector(".inline-replies"));
    await loadPublicMessages();
  });
}

async function submitQuestion(event) {
  event.preventDefault();
  if (!state.client) return setStatus("服务暂时不可用，请稍后再试。", true);

  const text = normalizeQuestionText(questionText.value);
  const validation = validateText(text, 8, 600);
  if (!validation.ok) return setStatus(validation.message, true);

  const token = createToken();
  const tokenHash = await sha256(token);

  await withBusy(questionForm, async () => {
    let { data, error } = await state.client.rpc("submit_question", {
      question_body: text,
      claim_token_hash_value: tokenHash,
      allow_public_value: questionPublicConsent.checked,
      owner_token_hash_value: state.ownerTokenHash
    });

    if (isMissingRpc(error)) {
      const fallback = await state.client.rpc("submit_question", {
        question_body: text,
        claim_token_hash_value: tokenHash
      });
      data = fallback.data;
      error = fallback.error;
    }

    if (error) throw error;

    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    url.searchParams.set("token", token);
    claimLink.value = url.toString();
    claimResult.hidden = false;
    const savedQuestion = Array.isArray(data) ? data[0] : null;
    let publicId = savedQuestion?.public_id || "";
    if (!publicId) publicId = await rememberSubmittedQuestionToken(text, token);
    rememberLocalQuestion({
      publicId,
      questionText: text,
      token,
      createdAt: savedQuestion?.created_at || new Date().toISOString()
    });
    state.hadStoredVisitorToken = true;
    questionForm.reset();
    updateAllCounters();
    setStatus("问题已保存。也可以稍后在“我的内容”里查看。");
  });
}

async function loadRandomQuestion() {
  if (!state.client) return setStatus("服务暂时不可用，请稍后再试。", true);

  if (state.questionPoolFilter === "seed_only") {
    loadSeedQuestion();
    return;
  }

  await withBusy(loadQuestionButton, async () => {
    randomQuestionCard.innerHTML = '<p class="muted">内容漂流中...</p>';
    const recentIds = getRecentQuestionIds();
    let data = null;
    let error = null;
    let attempts = state.answerQuestionTypeFilter === "all" ? 1 : 5;

    while (attempts > 0) {
      const result = await state.client.rpc("get_random_question", {
        answer_limit: Number(config.maxAnswersPerQuestion || 5),
        excluded_public_ids: getRecentQuestionIds()
      });
      data = result.data;
      error = result.error;

      if (isMissingRpc(error)) {
        const fallback = await state.client.rpc("get_random_question", {
          answer_limit: Number(config.maxAnswersPerQuestion || 5)
        });
        data = fallback.data;
        error = fallback.error;
      }

      const candidate = data?.[0] || null;
      if (!candidate || questionMatchesSelectedType(candidate.question_text)) break;
      rememberQuestionId(candidate.public_id);
      attempts -= 1;
    }

    if (error) throw error;
    if (
      state.answerQuestionTypeFilter !== "all" &&
      data?.[0] &&
      !questionMatchesSelectedType(data[0].question_text)
    ) {
      data = [];
    }
    state.currentQuestion = data?.[0] || null;

    if (!state.currentQuestion && recentIds.length) {
      clearRecentQuestionIds();
      return loadRandomQuestion();
    }

    if (!state.currentQuestion) {
      randomQuestionCard.innerHTML =
        '<p class="muted">暂时没有可回答的问题。稍后再试。</p>';
      answerForm.hidden = true;
      skipQuestionButton.hidden = true;
      return;
    }

    const seenMeta = getSeenQuestionMeta(state.currentQuestion.public_id);
    rememberQuestionId(state.currentQuestion.public_id);
    rememberSeenQuestion(state.currentQuestion.public_id);
    randomQuestionCard.innerHTML = `
      <p class="reply-meta">一个匿名问题 · ${Number(state.currentQuestion.answer_count || 0)} 条回复${formatSeenQuestionHint(seenMeta)}</p>
      <p>${escapeHtml(state.currentQuestion.question_text)}</p>
    `;
    answerForm.hidden = false;
    skipQuestionButton.hidden = false;
    resetAnswerFormForQuestion();
    updateAllCounters();
    setStatus("已抽取一个问题。");
  });
}

function handleQuestionPoolFilterChange(event) {
  state.questionPoolFilter = event.target.value;
  state.currentQuestion = null;
  answerForm.hidden = true;
  skipQuestionButton.hidden = true;
  resetAnswerFormForQuestion();
  if (seedQuestionNotice) {
    seedQuestionNotice.hidden = state.questionPoolFilter !== "seed_only";
  }
  randomQuestionCard.innerHTML =
    '<p class="muted">点击下面的按钮抽取一个问题。</p>';
  updateAllCounters();
}

function loadSeedQuestion() {
  const seedPool = SEED_QUESTIONS.filter((question) =>
    questionMatchesSelectedType(question.text)
  );
  const pool = seedPool.length ? seedPool : SEED_QUESTIONS;
  const seedQuestion = pool[Math.floor(Math.random() * pool.length)];
  const seenMeta = getSeenQuestionMeta(seedQuestion.id);

  state.currentQuestion = {
    ...seedQuestion,
    public_id: seedQuestion.id,
    question_text: seedQuestion.text,
    answer_count: 0
  };
  rememberSeenQuestion(seedQuestion.id);
  randomQuestionCard.innerHTML = `
    <p class="reply-meta">种子问题${formatSeenQuestionHint(seenMeta)}</p>
    <p>${escapeHtml(seedQuestion.text)}</p>
  `;
  answerForm.hidden = false;
  skipQuestionButton.hidden = false;
  answerText.value = "";
  answerText.maxLength = getSeedAnswerMaxLength(seedQuestion.text);
  answerPublicConsent.checked = false;
  answerPublicConsentLine?.removeAttribute("hidden");
  if (answerPublicConsentText) {
    answerPublicConsentText.textContent =
      "我知道这条回答会和种子问题一起公开显示在留言板。";
  }
  if (seedQuestionNotice) seedQuestionNotice.hidden = false;
  updateAllCounters();
  setStatus("已抽取一个种子问题。");
}

async function submitAnswer(event) {
  event.preventDefault();
  if (!state.client) return setStatus("服务暂时不可用，请稍后再试。", true);
  if (!state.currentQuestion) return setStatus("请先抽取一个问题。", true);

  const text = normalizeText(answerText.value);
  const validation = validateText(text, 2, 1000);
  if (!validation.ok) return setStatus(validation.message, true);

  if (state.currentQuestion.is_seed) {
    await submitSeedAnswer(text);
    return;
  }

  await withBusy(answerForm, async () => {
    let { error } = await state.client.rpc("submit_answer", {
      question_public_id_value: state.currentQuestion.public_id,
      answer_body: text,
      allow_public_value: answerPublicConsent.checked,
      owner_token_hash_value: state.ownerTokenHash
    });

    if (isMissingRpc(error)) {
      const fallback = await state.client.rpc("submit_answer", {
        question_public_id_value: state.currentQuestion.public_id,
        answer_body: text
      });
      error = fallback.error;
    }

    if (error) throw error;

    answerForm.hidden = true;
    state.currentQuestion = null;
    randomQuestionCard.innerHTML =
      '<p class="muted">回答已发送。你可以再抽一个问题。</p>';
    resetAnswerFormForQuestion();
    updateAllCounters();
    state.hadStoredVisitorToken = true;
    setStatus("回答已保存。");
  });
}

async function submitSeedAnswer(text) {
  if (!answerPublicConsent.checked) {
    return setStatus("请先确认这条回答会公开显示在留言板。", true);
  }

  const messageText = formatSeedAnswerMessage(state.currentQuestion.question_text, text);
  const validation = validateText(messageText, 2, 280);
  if (!validation.ok) {
    return setStatus("这条回答有点长，请缩短后再发布。", true);
  }

  await withBusy(answerForm, async () => {
    const { error } = await state.client.rpc("submit_public_message", {
      message_body: messageText,
      owner_token_hash_value: state.ownerTokenHash
    });

    if (error) throw error;

    answerForm.hidden = true;
    state.currentQuestion = null;
    randomQuestionCard.innerHTML =
      '<p class="muted">回答已发布到留言板。你可以再抽一个问题。</p>';
    resetAnswerFormForQuestion();
    updateAllCounters();
    setStatus("回答已发布到留言板。");
    await loadPublicMessages();
  });
}

function formatSeedAnswerMessage(questionText, answerBody) {
  return `问：${questionText} 答：${answerBody}`;
}

function getSeedAnswerMaxLength(questionText) {
  return Math.max(2, 280 - formatSeedAnswerMessage(questionText, "").length);
}

function resetAnswerFormForQuestion() {
  answerText.value = "";
  answerText.maxLength = 1000;
  answerPublicConsent.checked = false;
  if (answerPublicConsentText) {
    answerPublicConsentText.textContent =
      "如果提问者也同意，这组匿名问答可以公开显示。";
  }
}

async function checkReplies(event) {
  event.preventDefault();
  if (!state.client) return setStatus("服务暂时不可用，请稍后再试。", true);

  const token = extractToken(claimToken.value);
  if (!token) return setStatus("请输入私人链接或 token。", true);

  await checkRepliesByToken(token);
}

async function checkRepliesByToken(token) {
  const tokenHash = await sha256(token);
  state.currentClaimTokenHash = tokenHash;

  await withBusy(checkForm, async () => {
    const { data, error } = await state.client.rpc("get_replies_by_token", {
      claim_token_hash_value: tokenHash
    });

    if (error) throw error;
    renderReplies(data || []);
  });
}

function renderReplies(rows, options = {}) {
  const allowFeedback = options.allowFeedback !== false;
  if (!rows.length) {
    replyList.innerHTML =
      '<div class="reply-item"><p class="muted">没有找到这个 token 对应的问题，或暂时还没有回复。</p></div>';
    setStatus("");
    return;
  }

  const first = rows[0];
  const answers = rows.filter((row) => row.answer_text);
  const answerHtml = answers.length
    ? answers
        .map(
          (row, index) => `
            <article class="reply-item" data-answer-id="${escapeHtml(row.answer_public_id || "")}">
              <p class="reply-meta">匿名回复 ${index + 1}</p>
              <p>${escapeHtml(row.answer_text)}</p>
              ${row.asker_liked ? '<p class="reply-meta">你已喜欢这条回复</p>' : ""}
              ${row.asker_reply_text ? `<div class="inline-reply"><p class="reply-meta">你的补充回复</p><p>${escapeHtml(row.asker_reply_text)}</p></div>` : ""}
              ${allowFeedback && row.answer_public_id ? `
                <div class="content-actions">
                  <button class="secondary mini-button" data-action="like-answer" type="button">${row.asker_liked ? "已喜欢" : "喜欢这条回复"}</button>
                </div>
                ${row.asker_reply_text ? "" : `
                  <form class="reply-form">
                    <label for="asker-reply-${escapeHtml(row.answer_public_id)}">给回答者留一句</label>
                    <textarea id="asker-reply-${escapeHtml(row.answer_public_id)}" maxlength="240" placeholder="最多 240 字，只能发送一次。" required></textarea>
                    <div class="form-row">
                      <span class="small">只显示在这组问答里</span>
                      <button type="submit">发送</button>
                    </div>
                  </form>
                `}
              ` : ""}
            </article>
          `
        )
        .join("")
    : '<article class="reply-item"><p class="muted">这个问题还没有收到回复。</p></article>';

  replyList.innerHTML = `
    <article class="question-card">
      <p class="reply-meta">你的问题</p>
      <p>${escapeHtml(first.question_text)}</p>
    </article>
    ${answerHtml}
  `;
  setStatus(`找到 ${answers.length} 条回复。`);
}

async function handleReplyListClick(event) {
  const button = event.target.closest("button[data-action='like-answer']");
  if (!button) return;

  const answerId = button.closest("[data-answer-id]")?.dataset.answerId;
  if (!answerId || !state.currentClaimTokenHash) return;

  await withBusy(button, async () => {
    const { error } = await state.client.rpc("like_answer_by_asker", {
      claim_token_hash_value: state.currentClaimTokenHash,
      answer_public_id_value: answerId
    });
    if (error) throw error;
    setStatus("已喜欢这条回复。");
    await refreshCheckedReplies();
  });
}

async function submitAskerReply(event) {
  event.preventDefault();
  const form = event.target;
  const answerId = form.closest("[data-answer-id]")?.dataset.answerId;
  const textarea = form.querySelector("textarea");
  const text = normalizeText(textarea.value);
  const validation = validateText(text, 1, 240);
  if (!validation.ok) return setStatus(validation.message, true);

  await withBusy(form, async () => {
    const { error } = await state.client.rpc("send_asker_reply", {
      claim_token_hash_value: state.currentClaimTokenHash,
      answer_public_id_value: answerId,
      reply_body: text
    });
    if (error) throw error;
    setStatus("已发送。");
    await refreshCheckedReplies();
  });
}

async function refreshCheckedReplies() {
  const { data, error } = await state.client.rpc("get_replies_by_token", {
    claim_token_hash_value: state.currentClaimTokenHash
  });
  if (error) throw error;
  renderReplies(data || []);
}

async function copyClaim() {
  if (!claimLink.value) return;
  try {
    await navigator.clipboard.writeText(claimLink.value);
    setStatus("链接已复制。");
  } catch {
    claimLink.select();
    setStatus("已选中私人链接，可以手动复制。");
  }
}

function validateText(text, min, max) {
  if (text.length < min) {
    return { ok: false, message: `内容至少需要 ${min} 个字符。` };
  }
  if (text.length > max) {
    return { ok: false, message: `内容不能超过 ${max} 个字符。` };
  }
  if (blockedTerms.some((term) => text.toLowerCase().includes(term.toLowerCase()))) {
    return { ok: false, message: "内容像广告或骚扰信息，请修改后再提交。" };
  }
  return { ok: true };
}

function isMissingRpc(error) {
  return Boolean(
    error &&
      (error.message?.includes("Could not find the function") ||
        error.code === "PGRST202")
  );
}

function normalizeText(text) {
  return text.replace(/\s+/g, " ").trim();
}

function normalizeQuestionText(text) {
  const normalized = normalizeText(text);
  if (!normalized) return normalized;
  return /[?？！!。.]\s*$/.test(normalized) ? normalized : `${normalized}？`;
}

function getVisitorToken() {
  const existing = localStorage.getItem(VISITOR_TOKEN_KEY);
  if (existing) return existing;

  const token = createToken();
  localStorage.setItem(VISITOR_TOKEN_KEY, token);
  return token;
}

function hasStoredVisitorToken() {
  return Boolean(localStorage.getItem(VISITOR_TOKEN_KEY));
}

function createToken() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function extractToken(value) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    return url.searchParams.get("token") || "";
  } catch {
    return trimmed;
  }
}

function getRecentQuestionIds() {
  try {
    return JSON.parse(localStorage.getItem(RECENT_QUESTIONS_KEY) || "[]");
  } catch {
    return [];
  }
}

function rememberQuestionId(publicId) {
  const nextIds = [
    publicId,
    ...getRecentQuestionIds().filter((id) => id !== publicId)
  ].slice(0, MAX_RECENT_QUESTIONS);
  localStorage.setItem(RECENT_QUESTIONS_KEY, JSON.stringify(nextIds));
}

function clearRecentQuestionIds() {
  localStorage.removeItem(RECENT_QUESTIONS_KEY);
}

function getSeenQuestionMap() {
  try {
    const map = JSON.parse(localStorage.getItem(SEEN_QUESTIONS_META_KEY) || "{}");
    return map && typeof map === "object" && !Array.isArray(map) ? map : {};
  } catch {
    return {};
  }
}

function getSeenQuestionMeta(publicId) {
  if (!publicId) return null;
  return getSeenQuestionMap()[publicId] || null;
}

function rememberSeenQuestion(publicId) {
  if (!publicId) return;

  const map = getSeenQuestionMap();
  const previous = map[publicId] || {};
  map[publicId] = {
    first_seen_at: previous.first_seen_at || new Date().toISOString(),
    last_seen_at: new Date().toISOString(),
    seen_count: Number(previous.seen_count || 0) + 1
  };
  localStorage.setItem(SEEN_QUESTIONS_META_KEY, JSON.stringify(map));
}

function formatSeenQuestionHint(meta) {
  if (!meta) return " · 新的漂流";
  return ` · 重新看到 · 上次 ${formatDate(meta.last_seen_at)}`;
}

function getLocalQuestionTokens() {
  try {
    const tokens = JSON.parse(localStorage.getItem(LOCAL_QUESTION_TOKENS_KEY) || "{}");
    return tokens && typeof tokens === "object" ? tokens : {};
  } catch {
    return {};
  }
}

function getLocalQuestions() {
  let savedQuestions = [];
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_QUESTIONS_KEY) || "[]");
    savedQuestions = Array.isArray(parsed) ? parsed : [];
  } catch {
    savedQuestions = [];
  }

  const tokenMapQuestions = Object.entries(getLocalQuestionTokens()).map(
    ([publicId, token]) => ({
      publicId,
      token,
      questionText: "本地保存的问题",
      createdAt: ""
    })
  );
  const merged = [...savedQuestions, ...tokenMapQuestions].filter(
    (item) => item?.token
  );
  const seen = new Set();

  return merged.filter((item) => {
    const key = item.publicId || item.token;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function rememberLocalQuestion({ publicId = "", questionText = "", token, createdAt }) {
  if (!token) return;

  const nextQuestions = [
    {
      publicId,
      questionText,
      token,
      createdAt: createdAt || new Date().toISOString()
    },
    ...getLocalQuestions().filter((item) => {
      if (publicId && item.publicId === publicId) return false;
      return item.token !== token;
    })
  ].slice(0, 30);

  localStorage.setItem(LOCAL_QUESTIONS_KEY, JSON.stringify(nextQuestions));
  if (publicId) rememberLocalQuestionToken(publicId, token);
  updateLocalSummary();
}

function rememberLocalQuestionToken(publicId, token) {
  if (!publicId || !token) return;

  const tokens = getLocalQuestionTokens();
  tokens[publicId] = token;
  localStorage.setItem(LOCAL_QUESTION_TOKENS_KEY, JSON.stringify(tokens));
}

function getLocalQuestionToken(publicId) {
  return getLocalQuestionTokens()[publicId] || "";
}

async function rememberSubmittedQuestionToken(questionBody, token) {
  if (!state.client || !state.ownerTokenHash) return "";

  const { data, error } = await state.client.rpc("get_my_content", {
    owner_token_hash_value: state.ownerTokenHash
  });
  if (error) return "";

  const question = (data || [])
    .filter((item) => item.item_type === "question" && item.body === questionBody)
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))[0];

  if (question?.public_id) rememberLocalQuestionToken(question.public_id, token);
  return question?.public_id || "";
}

function getHiddenPublicMessageIds() {
  try {
    const ids = JSON.parse(localStorage.getItem(HIDDEN_PUBLIC_MESSAGES_KEY) || "[]");
    return Array.isArray(ids) ? ids.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function saveHiddenPublicMessageIds() {
  localStorage.setItem(
    HIDDEN_PUBLIC_MESSAGES_KEY,
    JSON.stringify(state.hiddenPublicMessageIds)
  );
}

function isPublicMessageHidden(publicId) {
  return state.hiddenPublicMessageIds.includes(publicId);
}

function updateHiddenMessagesControl() {
  if (!restoreHiddenMessagesButton) return;

  const count = state.hiddenPublicMessageIds.length;
  restoreHiddenMessagesButton.hidden = count === 0;
  restoreHiddenMessagesButton.textContent = count
    ? `恢复已隐藏内容（${count}）`
    : "恢复已隐藏内容";
}

function renderSiteNote() {
  if (!siteNote) return;

  siteNote.textContent = `v${SITE_NOTE.version} · ${t(SITE_NOTE.textKey)}`;
  siteNote.hidden = false;
}

function updateLocalSummary() {
  if (!localSummary) return;

  const localQuestionCount = getLocalQuestions().length;
  const savedCount = Object.keys(state.savedMessages || {}).length;
  const hiddenCount = state.hiddenPublicMessageIds.length;
  localSummary.textContent = formatText("summary.local", {
    questions: localQuestionCount,
    saved: savedCount,
    hidden: hiddenCount
  });
}

function renderSeedQuestionNotice() {
  if (!seedQuestionNotice) return;

  seedQuestionNotice.textContent =
    `种子问题会不定期补充。当前 ${SEED_QUESTIONS.length} 个；回答会公开显示在留言板。`;
}

async function loadMyContent() {
  if (!state.client || !state.ownerTokenHash) return;

  myContent.innerHTML = '<article class="empty-state">正在读取这个浏览器里的内容。</article>';
  const { data, error } = await state.client.rpc("get_my_content", {
    owner_token_hash_value: state.ownerTokenHash
  });

  if (isMissingRpc(error)) {
    myContent.innerHTML =
      '<article class="empty-state">这个入口需要先更新数据库函数后才能使用。</article>';
    return;
  }

  if (error) {
    myContent.innerHTML = `<article class="empty-state">${escapeHtml(error.message)}</article>`;
    return;
  }

  renderMyContent(data || []);
}

function renderMyContent(items) {
  const localQuestions = getLocalQuestions();

  if (!items.length && !localQuestions.length) {
    myContent.innerHTML = `
      <article class="empty-state">
        <p>${escapeHtml(t("empty.localMissingTitle"))}</p>
        <p class="small">${escapeHtml(t("empty.localMissingBody"))}</p>
      </article>
    `;
    return;
  }

  const groups = {
    question: items.filter((item) => item.item_type === "question"),
    answer: items.filter((item) => item.item_type === "answer"),
    public_message: items.filter((item) => item.item_type === "public_message")
  };
  const remoteQuestionIds = new Set(groups.question.map((item) => item.public_id));
  const localOnlyQuestions = localQuestions.filter(
    (item) => !item.publicId || !remoteQuestionIds.has(item.publicId)
  );

  myContent.innerHTML = `
    ${renderMySection(t("mine.questions"), groups.question, "question")}
    ${renderLocalQuestionSection(localOnlyQuestions)}
    ${renderMySection(t("mine.answers"), groups.answer, "answer")}
    ${renderMySection(t("mine.messages"), groups.public_message, "public_message")}
  `;
}

function renderLocalQuestionSection(items) {
  if (!items.length) return "";

  return `
    <section class="mine-section">
      <h3>${t("mine.localLinks")}</h3>
      ${items
        .map((item) => `
          <article class="content-card">
            <p class="message-meta">${item.createdAt ? formatDate(item.createdAt) : "本地记录"}</p>
            <p class="message-body">${escapeHtml(item.questionText || "本地保存的问题")}</p>
            <div class="content-actions">
              <button class="secondary mini-button" data-action="view-local-question-replies" data-token="${escapeHtml(item.token)}" type="button">查看回复</button>
            </div>
            <p class="message-meta">这条记录保存在当前浏览器里，可用来找回私人链接对应的回复。</p>
          </article>
        `)
        .join("")}
    </section>
  `;
}

function renderMySection(title, items, type) {
  if (!items.length) {
    return `
      <section class="mine-section">
        <h3>${title}</h3>
        <article class="empty-state">${t("empty.none")}</article>
      </section>
    `;
  }

  return `
    <section class="mine-section">
      <h3>${title}</h3>
      ${items
        .map((item) => {
          const canEditQuestion = type === "question" && Number(item.reply_count || 0) === 0;
          const canEditMessage = type === "public_message";
          const canDelete = type !== "answer";
          const localToken = type === "question" ? getLocalQuestionToken(item.public_id) : "";
          return `
            <article class="content-card" data-my-type="${type}" data-my-id="${escapeHtml(item.public_id)}">
              <p class="message-meta">${formatDate(item.created_at)}${item.edited_at ? ` · 已于 ${formatDate(item.edited_at)} 编辑过` : ""}${item.reply_count ? ` · ${Number(item.reply_count)} 条回复` : ""}</p>
              <p class="message-body">${escapeHtml(item.body)}</p>
              <div class="content-actions">
                ${localToken ? '<button class="secondary mini-button" data-action="view-replies" type="button">查看回复</button>' : ""}
                ${type === "question" && !localToken ? '<button class="secondary mini-button" data-action="recover-replies" type="button">找回回复</button>' : ""}
                ${canEditQuestion || canEditMessage ? '<button class="secondary mini-button" data-action="edit-my" type="button">编辑</button>' : ""}
                ${canDelete ? '<button class="secondary mini-button danger-button" data-action="delete-my" type="button">删除</button>' : ""}
              </div>
              ${type === "question" && !localToken ? '<p class="message-meta">如果这是旧问题，可以尝试用本设备记录找回回复。</p>' : ""}
            </article>
          `;
        })
        .join("")}
    </section>
  `;
}

async function handleMyContentClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  if (button.dataset.action === "view-local-question-replies") {
    const token = button.dataset.token || "";
    if (!token) return setStatus("这条本地记录没有可用的私人 token。", true);
    claimToken.value = token;
    showView("check");
    await checkRepliesByToken(token);
    return;
  }

  const card = button.closest("[data-my-type]");
  if (!card) return;
  const type = card.dataset.myType;
  const id = card.dataset.myId;
  const currentText = card.querySelector(".message-body")?.textContent || "";

  if (button.dataset.action === "view-replies") {
    const token = getLocalQuestionToken(id);
    if (!token) return setStatus("这个问题没有保存在本浏览器的私人 token。", true);
    claimToken.value = token;
    showView("check");
    await checkRepliesByToken(token);
  }

  if (button.dataset.action === "recover-replies") {
    showView("check");
    claimToken.value = "";
    await recoverRepliesByOwnedQuestion(id);
  }

  if (button.dataset.action === "edit-my") {
    const nextText = prompt("修改内容", currentText);
    if (nextText === null) return;
    await editMyContent(type, id, nextText);
  }

  if (button.dataset.action === "delete-my") {
    if (!confirm("删除这条内容？")) return;
    await deleteMyContent(type, id);
  }
}

async function recoverRepliesByOwnedQuestion(questionPublicId) {
  if (!state.client || !state.ownerTokenHash) return;

  state.currentClaimTokenHash = "";
  await withBusy(checkForm, async () => {
    const { data, error } = await state.client.rpc("get_my_question_replies", {
      owner_token_hash_value: state.ownerTokenHash,
      question_public_id_value: questionPublicId
    });

    if (isMissingRpc(error)) {
      replyList.innerHTML =
        '<div class="reply-item"><p class="muted">这个找回入口需要更新数据库函数后才能使用。</p></div>';
      setStatus("");
      return;
    }

    if (error) throw error;
    renderReplies(data || [], { allowFeedback: false });
  });
}

async function editMyContent(type, id, value) {
  const text = type === "question" ? normalizeQuestionText(value) : normalizeText(value);
  const max = type === "question" ? 600 : 280;
  const min = type === "question" ? 8 : 2;
  const validation = validateText(text, min, max);
  if (!validation.ok) return setStatus(validation.message, true);

  const rpcName = type === "question" ? "update_my_question" : "update_public_message";
  const params =
    type === "question"
      ? {
          question_public_id_value: id,
          owner_token_hash_value: state.ownerTokenHash,
          question_body: text
        }
      : {
          message_public_id_value: id,
          owner_token_hash_value: state.ownerTokenHash,
          message_body: text
        };

  const { error } = await state.client.rpc(rpcName, params);
  if (error) return setStatus(error.message, true);

  setStatus("已更新。");
  await loadMyContent();
  if (type === "public_message") await loadPublicMessages();
}

async function deleteMyContent(type, id) {
  const rpcName = type === "question" ? "delete_my_question" : "delete_public_message";
  const params =
    type === "question"
      ? { question_public_id_value: id, owner_token_hash_value: state.ownerTokenHash }
      : { message_public_id_value: id, owner_token_hash_value: state.ownerTokenHash };

  const { error } = await state.client.rpc(rpcName, params);
  if (error) return setStatus(error.message, true);

  setStatus("已删除。");
  await loadMyContent();
  if (type === "public_message") await loadPublicMessages();
}

async function withBusy(element, task) {
  const buttons = [...element.querySelectorAll?.("button"), element].filter(
    (item) => item?.tagName === "BUTTON"
  );
  buttons.forEach((button) => (button.disabled = true));
  setStatus("处理中...");

  try {
    await task();
  } catch (error) {
    console.error(error);
    setStatus(error.message || "发生了一点错误，请稍后再试。", true);
  } finally {
    buttons.forEach((button) => (button.disabled = false));
  }
}

function updateAllCounters() {
  document.querySelectorAll("[data-counter-for]").forEach((counter) => {
    const input = document.querySelector(`#${counter.dataset.counterFor}`);
    if (!input) return;
    counter.textContent = `${input.value.length} / ${input.maxLength}`;
  });
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("is-error", isError);
}

function formatDate(value) {
  if (!value) return "刚刚";
  return new Intl.DateTimeFormat("zh-Hans", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    return {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char];
  });
}
