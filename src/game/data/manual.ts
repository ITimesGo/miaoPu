import { GOAL_HISTORY_LIMIT, seasonGoalPoolSize } from './goals'
import {
  SELL_BASE_PRICE,
  SELL_LABEL,
} from './sell'
import {
  COMFORT_BOOST_MINUTES,
  COMFORT_BOOST_MULT,
  JOB_ROLES,
  MEDICINE_PER_CURE_NO_DOCTOR,
  MEDICINE_PER_CURE_WITH_DOCTOR,
  ROLE_LABEL,
} from './careers'
import {
  MAJOR_COOLDOWN_MINUTES,
  MAJOR_DECIDE_MS,
  PLAGUE_MIN_CATS,
  PLAGUE_MIN_DAY,
  STRAY_MIN_DAY,
  STRAY_MIN_EMPTY_SLOTS,
} from './majorEvents'
import {
  PIRATE_MIN_DAY,
  PIRATE_STOCK_THRESHOLD,
  PIRATE_WEALTH_THRESHOLD,
} from './pirates'
import { CAT_BREEDS } from './breeds'
import { GAME_LOG_LIMIT } from './gameLog'
import { recruitPriceFor } from './shop'
import {
  coinSoftCap,
  OVERFLOW_COIN_RATE,
  softCapFor,
  type SoftCapBuildings,
} from './economy'
import {
  COLD_SHORTAGE_SICK_BONUS,
  HEATING_WOOD_PER_CAT_MILD,
  HEATING_WOOD_PER_CAT_WINTER,
  STARTING_WOOD,
} from './heating'
import {
  STARTING_ORE,
  TOOL_MAINT_ORE_PER_WORKER,
  TOOLS_WORN_YIELD_MULT,
} from './tools'
import {
  BOAT_FISH_CAP,
  BOAT_MAX_LEVEL,
  BOAT_WOOD_CAP,
  catCapForCottage,
  COTTAGE_MAX_LEVEL,
  COTTAGE_UPGRADE_PRICE,
  DAYS_PER_SEASON,
  FARM_SIZE,
  FISH_DAILY_PER_CAT,
  GRANARY_BUY_ORE,
  GRANARY_BUY_PRICE,
  GRANARY_BUY_WOOD,
  GRANARY_CAPACITY,
  GRANARY_DAILY_DECAY,
  GRANARY_MAX_LEVEL,
  GRANARY_REPAIR_AMOUNT,
  GRANARY_REPAIR_COST,
  POCKET_WHEAT_CAP,
  RECRUIT_PRICE_GROWTH,
  HARBOR_MAX_LEVEL,
  CHOP_WOOD_YIELD,
  FISH_YIELD,
  MINE_DAILY_LIMIT,
  MINE_ORE_YIELD,
  MINUTES_PER_DAY,
  WORK_RESERVE_DAYS,
  ROLE_CONSUME_PER_LEVEL,
  ROLE_MAX_LEVEL,
  ROLE_UPGRADE_KNOWLEDGE,
  ROLE_YIELD_PER_LEVEL,
  SEED_PACK_AMOUNT,
  SEED_PACK_PRICE,
  voyageCooldownMinutes,
  voyageDurationMinutes,
} from '../types'

export type ManualSection = {
  id: string
  title: string
  paragraphs: string[]
}

export function filterManualSections(
  sections: ManualSection[],
  query: string,
): ManualSection[] {
  const q = query.trim().toLowerCase()
  if (!q) return sections
  return sections.filter((s) => {
    if (s.title.toLowerCase().includes(q)) return true
    return s.paragraphs.some((p) => p.toLowerCase().includes(q))
  })
}

/** 返回片段；调用方把 hit 段包成 <mark> */
export function highlightSegments(
  text: string,
  query: string,
): Array<{ text: string; hit: boolean }> {
  const q = query.trim()
  if (!q) return [{ text, hit: false }]
  const lower = text.toLowerCase()
  const needle = q.toLowerCase()
  const out: Array<{ text: string; hit: boolean }> = []
  let i = 0
  while (i < text.length) {
    const at = lower.indexOf(needle, i)
    if (at < 0) {
      out.push({ text: text.slice(i), hit: false })
      break
    }
    if (at > i) out.push({ text: text.slice(i, at), hit: false })
    out.push({ text: text.slice(at, at + needle.length), hit: true })
    i = at + needle.length
  }
  return out.length ? out : [{ text, hit: false }]
}

const roleList = JOB_ROLES.map((r) => ROLE_LABEL[r]).join('、')
const yieldPct = Math.round(ROLE_YIELD_PER_LEVEL * 100)
const consumePct = Math.round(ROLE_CONSUME_PER_LEVEL * 100)
const comfortBoostPct = Math.round((COMFORT_BOOST_MULT - 1) * 100)
const comfortBoostHours = COMFORT_BOOST_MINUTES / 60
const voyageHours = (voyageDurationMinutes(1) / 60).toFixed(1)
const cooldownHours = (voyageCooldownMinutes(1) / 60).toFixed(1)
const firstPaidBreed = CAT_BREEDS.find((b) => b.recruitPrice > 0)!
const secondCatPrice = recruitPriceFor(firstPaidBreed.recruitPrice, 1)

export const MANUAL_SECTIONS: ManualSection[] = [
  {
    id: 'overview',
    title: '开局与目标',
    paragraphs: [
      '喵圃是一座小岛：养猫、种田、采矿伐木、出海贸易。猫会自主干活，头顶偶尔冒出碎碎念；生病时头顶会挂「病」字标。你主要安排职业、扩建建筑、盯紧口粮与药品。',
      `开局一只猫、约 80 金；第二只猫（如「${firstPaidBreed.name}」）到手约 ${secondCatPrice} 金，开局金币不够，收完第一波麦卖掉后通常就能扩编。`,
      `每季约 ${DAYS_PER_SEASON} 天。季节目标种类含：囤鱼/麦/矿/木/金币/知识，小屋/港口/货船等级，猫群数量，以及本季出航、炼药、收获、伐木次数；同种类还有多档数值。四季合计约 ${seasonGoalPoolSize()} 条候选，并避开近 ${GOAL_HISTORY_LIMIT} 季已出现的组合。完成后可得金币、药品或知识。`,
      '若猫全部失散或饿死，会进入全灭；可重新开始。',
      '进度会自动保存在本浏览器本地；刷新或下次打开同一地址会继续。左下角「重开」（或全灭后的「重新开始」）会清空存档并开新局，需二次确认。清除站点数据也会丢掉进度。',
      `左下角「日志」可展开大事记：日结、购买花费、病死/走失、出海、海盗/疫病/流浪猫、季节目标等；最多保留 ${GAME_LOG_LIMIT} 条，随存档保存，重开清空。病死与海盗等严重条目会醒目标注，可点「只看严重」筛选；有新严重事件时日志按钮会显示红点计数。`,
    ],
  },
  {
    id: 'time',
    title: '时间与季节',
    paragraphs: [
      `游戏内一天共 ${MINUTES_PER_DAY} 分钟；清晨到夜晚循环，影响猫咪作息与出海窗口。`,
      '左上角信息板可看资源、时钟与流速：正式版提供一倍 / 二倍；倍速会同步加快游戏时钟、作物/树木生长、猫咪走路与干活节奏。猫群名单可点「猫群 ▾」展开；玩具零食在商店查看。',
      `一季 ${DAYS_PER_SEASON} 天，四季轮转。天气会下雨或晴朗，偶尔雨后出虹；不影响核心玩法，但氛围会变。`,
      '跨日结算时消耗鱼肉口粮、可能生病/治愈，并推进季节目标进度。',
      `偶发大事（海盗 / 疫病潮 / 流浪猫）同时最多一件决策窗；约 ${Math.round(MAJOR_DECIDE_MS / 60000)} 分钟真实倒计时，超时默认：海盗献贡、疫病硬扛、流浪猫婉拒。结算后共享冷却约 ${(MAJOR_COOLDOWN_MINUTES / MINUTES_PER_DAY / DAYS_PER_SEASON).toFixed(1)} 季。被动商船/丰收/欠收进行中时不新开大事。`,
      `海盗：约第 ${PIRATE_MIN_DAY} 天起，仓库物资加权 ≥ ${PIRATE_STOCK_THRESHOLD} 且总富裕 ≥ ${PIRATE_WEALTH_THRESHOLD} 时日结偶发（刚过线约 5%，越富越高，封顶约 14%）。献贡保平安；反抗看交战进度（可能损猫、缴获，极罕见全灭）。`,
      `疫病潮：约第 ${PLAGUE_MIN_DAY} 天、猫 ≥ ${PLAGUE_MIN_CATS}，且药偏紧或病猫较多时偶发。隔离耗药并降低未来两日生病风险；硬扛则升高三日风险（有医生略轻）。疫病残留不阻挡下一件大事。`,
      `流浪猫投奔：约第 ${STRAY_MIN_DAY} 天、小屋至少空 ${STRAY_MIN_EMPTY_SLOTS} 个名额，鱼与零食玩具较充裕时偶发。收留付少量鱼金加入散民；婉拒无惩罚。`,
    ],
  },
  {
    id: 'resources',
    title: '资源',
    paragraphs: [
      '常见资源：金币、麦种、小麦、鱼肉、矿石、木材、知识、药品。左侧商店可购买种子、零食玩具，以及升级建筑。',
      `鱼肉是每日口粮（基础约每猫 ${FISH_DAILY_PER_CAT}，职业等级越高日耗越多）。`,
      `木材用于建筑与出海，也要生火取暖：春夏秋夜间每猫约 ${HEATING_WOOD_PER_CAT_MILD} 木，冬天全天每猫约 ${HEATING_WOOD_PER_CAT_WINTER} 木（日结扣除，有多少烧多少）。开局自带木材 ×${STARTING_WOOD}，尽早安排伐木工补仓；不足时生病风险升高约 ${Math.round(COLD_SHORTAGE_SICK_BONUS * 100)}%，不会直接冻死。`,
      `矿石用于建筑，也要保养工具：矿工/伐木工/渔夫日结各耗 ${TOOL_MAINT_ORE_PER_WORKER} 矿（有多少扣多少）。开局自带矿石 ×${STARTING_ORE}；不足则次日这三类干活产量约 ×${TOOLS_WORN_YIELD_MULT}（变钝），备足矿日结后恢复。`,
      (() => {
        const lv1: SoftCapBuildings = { cottage: 1, harbor: 1, boat: 1, granary: 0 }
        const lv8: SoftCapBuildings = { cottage: 8, harbor: 8, boat: 8, granary: 8 }
        return `库存软上限随建筑升高：开局鱼 ${softCapFor('fish', lv1)}、矿/木/药 ${softCapFor('ore', lv1)}、知识 ${softCapFor('knowledge', lv1)}、玩/零 ${softCapFor('toy', lv1)}、金库 ${coinSoftCap(lv1)}；满级约鱼 ${softCapFor('fish', lv8)}、矿/木/药 ${softCapFor('ore', lv8)}、知识 ${softCapFor('knowledge', lv8)}、玩/零 ${softCapFor('toy', lv8)}、金库 ${coinSoftCap(lv8)}。绑定：小屋→玩/零/知（及金库）；码头→鱼与金库（取小屋/码头较大）；货船→药；粮仓→矿/木。小麦容量随粮仓等级与完好度；猫口随小屋。`
      })(),
      `到顶后仍可继续生产：超额按溢出兑金（鱼/麦各 ${OVERFLOW_COIN_RATE.fish}、矿/木各 ${OVERFLOW_COIN_RATE.ore}、知识 ${OVERFLOW_COIN_RATE.knowledge}、药品 ${OVERFLOW_COIN_RATE.medicine}、玩具/零食各 ${OVERFLOW_COIN_RATE.toy}）；金库也满时无法兑金。商店买玩具/零食到顶则无法再买。`,
      `麦种可在商店购买：${SEED_PACK_PRICE} 金一包，共 ${SEED_PACK_AMOUNT} 粒。知识多由学者研读获得，用于职业升级与建筑升级；知识与药品也可在商店回收页折价出售。`,
      `玩具与零食：猫玩耍或加餐后约 ${comfortBoostHours} 小时内，采矿/伐木/钓鱼/研读/炼药/收麦产出约 +${comfortBoostPct}%；再玩再吃会刷新时长。日结舒适合计消耗（先零食后玩具），口粮仍靠鱼肉。`,
      `矿工/伐木/渔夫每次基础产出约 ${MINE_ORE_YIELD}/${CHOP_WOOD_YIELD}/${FISH_YIELD}，每日最多各 ${MINE_DAILY_LIMIT} 次。鱼/木/矿低于约 ${WORK_RESERVE_DAYS} 日消耗储备时，对应户外工会少摸鱼、优先打满日限。药品只用于治病，不能当饭吃。`,
    ],
  },
  {
    id: 'careers',
    title: '猫咪与职业',
    paragraphs: [
      `可编制职业：${roleList}。散民闲逛待分配。`,
      '商店「猫咪」页的职业编制：+ 从散民就任，− 解除回散民；就任与解除均不消耗知识。没有散民时须先 − 解除其他职业。点职业旁「？」可看职责说明（如渔夫钓鱼补口粮，船商负责贸易加成与出海）。',
      '解除时保留职业等级；再次就任任意职业时等级降 1 级（最低仍为 Lv.1）。例如 Lv.3 矿工卸任再当农夫 → Lv.2。',
      `职业等级最高 Lv.${ROLE_MAX_LEVEL}。每升一级产能约 +${yieldPct}%，日耗约 +${consumePct}%。升级耗知识，例如升到 Lv.2 需 ${ROLE_UPGRADE_KNOWLEDGE[2]} 知识。`,
      '农夫耕田、矿工采矿、伐木工砍树（补建筑与取暖木材）、渔夫钓鱼、学者研读、船商参与贸易加成、医生炼药并降低治病药耗。生病时会停工，需用药治愈。学者/船商/医生不产口粮与取暖资源，猫口多时请保证渔夫与伐木有余力。',
    ],
  },
  {
    id: 'farm',
    title: '农田与粮仓',
    paragraphs: [
      `农田为 ${FARM_SIZE}×${FARM_SIZE} 格。农夫会翻地、播种、浇水照料；成熟小麦可收入囊或送入粮仓。`,
      `粮仓最高 Lv.${GRANARY_MAX_LEVEL}。建造约 ${GRANARY_BUY_PRICE} 金（另需矿 ${GRANARY_BUY_ORE}、木 ${GRANARY_BUY_WOOD}），Lv.1 小麦硬容量 ${GRANARY_CAPACITY[1]}（未建仓时随身上限 ${POCKET_WHEAT_CAP}）。每日完好度约降 ${GRANARY_DAILY_DECAY}；损坏后可用 ${GRANARY_REPAIR_COST} 金维修，恢复约 ${GRANARY_REPAIR_AMOUNT} 完好度。完好度影响小麦容量。`,
      '收割时若粮仓已满，小麦仍会收割完毕，超额部分溢出兑金。麦种告罄的可种植季会增加生病与走失风险，记得补种。',
    ],
  },
  {
    id: 'buildings',
    title: '建筑升级',
    paragraphs: [
      `小屋 / 码头 / 货船 / 粮仓均最高 Lv.${COTTAGE_MAX_LEVEL}。小屋猫口由 Lv.1 的 ${catCapForCottage(1)} 只到满级 ${catCapForCottage(COTTAGE_MAX_LEVEL)} 只；每级外观略加强。`,
      `码头影响出海售价与冷却；货船影响装货与航程（满级装鱼约 ${BOAT_FISH_CAP[BOAT_MAX_LEVEL]}、木 ${BOAT_WOOD_CAP[BOAT_MAX_LEVEL]}）。码头会陆续出现栏杆、石砌边、灯笼与吊臂；货船加桅帆、船舱、货箱、旗帜与更多饰件。`,
      `粮仓升级会增高、加侧仓、梯子与坡道等，完好度低时木色发暗。升级耗金币、矿、木、知识，具体价格见商店。例如小屋升到 Lv.2 需 ${COTTAGE_UPGRADE_PRICE[2]} 金（另加矿木知识）；码头最高 Lv.${HARBOR_MAX_LEVEL}。`,
      '商店建筑升级/建造项会显示库存软帽增量（有上涨才写，如玩具、鱼肉、金库等）。',
    ],
  },
  {
    id: 'voyage',
    title: '出海贸易',
    paragraphs: [
      `需有健康船商，且约在白天 7–18 点、船在港且冷却结束。货船 Lv.1 最多装鱼 ${BOAT_FISH_CAP[1]}、木 ${BOAT_WOOD_CAP[1]}；有货才能出航。`,
      '装货会预留明日口粮鱼与当日取暖木，只装超出预留的部分；预留后无货则暂缓出航。',
      `Lv.1 约航行 ${voyageHours} 小时游戏时间，回港后码头冷却约 ${cooldownHours} 小时（等级越高越快）。回港结算金币，偶有药品。`,
      '船商等级会提高贸易售价加成。季节目标里的「出航次数」在成功回港时累计；「收获」「伐木」在对应行动成功时累计。',
    ],
  },
  {
    id: 'survival',
    title: '生病与全灭',
    paragraphs: [
      `日结与白天都会自动用药：岛上有医生编制时每只 ${MEDICINE_PER_CURE_WITH_DOCTOR} 药，无医生则每只 ${MEDICINE_PER_CURE_NO_DOCTOR} 药。药不够则病猫继续歇工；挨到日结仍不够药则离世，不再计入当日口粮。随后按仍在岛上的猫扣鱼肉（基础约每猫 ${FISH_DAILY_PER_CAT}，等级越高越耗），并扣取暖木材。`,
      '鱼严重短缺或麦种长期告罄时，可能饿死/走失。木材不够生火时只会提高生病风险，不会直接冻死。户外职业生病概率略高。',
      '猫全部消失即全灭，可重新开始一局。',
    ],
  },
  {
    id: 'shop',
    title: '商店与编制',
    paragraphs: [
      '左下角「商店」可折叠：物品 / 回收 / 建筑 / 猫咪 四个分页；旁边「说明」可打开说明书。',
      '物品：种子、零食、玩具等。回收：折价出售小麦、矿石、木材、鱼肉、知识、药品换金币（低于码头/出海价）；鱼肉会预留明日口粮。商船买鱼也会预留口粮。建筑：粮仓、小屋、码头、货船。猫咪：买猫、职业编制、职业升级。',
      `招募价格按已有猫数复合上涨（约 ×${RECRUIT_PRICE_GROWTH}/只）；第二只约 ${secondCatPrice} 金（高于开局金币），需先收割卖麦再买。品种会优先凑齐，收齐后仍可重复招募，直到小屋猫口上限。`,
      `回收基价约：${SELL_LABEL.wheat} ${SELL_BASE_PRICE.wheat} 金、${SELL_LABEL.ore} ${SELL_BASE_PRICE.ore} 金、${SELL_LABEL.wood} ${SELL_BASE_PRICE.wood} 金、${SELL_LABEL.fish} ${SELL_BASE_PRICE.fish} 金、${SELL_LABEL.knowledge} ${SELL_BASE_PRICE.knowledge} 金、${SELL_LABEL.medicine} ${SELL_BASE_PRICE.medicine} 金；有健康船商时单价略升。急用钱或清仓可用，正经赚钱仍靠码头卖麦、商船与出海。`,
      '职业编制在猫咪页；有散民即可免费 + 就任，− 解除也免费。换岗会降 1 级职业等级。',
    ],
  },
]
