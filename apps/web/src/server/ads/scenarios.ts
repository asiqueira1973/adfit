import type { Database } from "../db/database.types";

type Scenario = Database["public"]["Enums"]["cenario"];

/**
 * Descrição em inglês de cada cenário, enviada ao roteirista junto com o código (melhoria M-1,
 * 01/11/2026). Nomes genéricos: nunca o nome de um lugar real nem marca/logo de academia.
 * Recebe: — . Devolve: mapa cenário → descrição.
 */
export const SCENARIO_BRIEFS: Record<Scenario, string> = {
  academia: "Modern gym with free weights and machines, no brand names or logos.",
  box_crossfit: "Industrial functional-training box: rig, barbells, kettlebells, rubber floor, no brand names or logos.",
  estudio_funcional: "Small bright functional-training studio with mats, light equipment and natural light.",
  ao_ar_livre_urbano: "Urban outdoor setting: city streets, sidewalks and modern buildings.",
  ao_ar_livre_natureza: "Outdoor nature setting: trails, trees, hills or open fields.",
  pista_de_corrida: "Athletics running track with lane lines.",
  orla_praia:
    "Beachfront promenade in a tropical coastal city: wide patterned stone sidewalk next to a bike lane, sand and ocean on one side, palm trees and buildings on the other. Generic location, never a named real place.",
  academia_praia:
    "Outdoor calisthenics station on the beach sand: pull-up bars, parallel bars and simple metal workout equipment, ocean in the background. Generic location, never a named real place.",
  parque_urbano:
    "Large urban park in a big city: tree-lined paved paths, wide lawns, a lake and modern pavilions, city skyline beyond the trees. Generic location, never a named real place.",
  calcadao_rio:
    "Riverside walkway in a downtown area: wide paved path along a river, railings, bridges and glass skyscrapers across the water. Generic location, never a named real place.",
  academia_ampla:
    "Large premium gym with high ceilings, bright white daylight, big windows and long rows of modern equipment, very clean. No brand names, logos or signage anywhere.",
};
