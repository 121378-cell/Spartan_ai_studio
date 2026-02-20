# Plan de Mejora de Tests - Spartan Hub Backend

## Objetivo
Alcanzar 90% de tests passing en 4 semanas

## Progreso Actual
✅ **Test databaseRole.test.ts**: 5/5 passing
✅ **Test knowledgeBasePopulation.test.ts**: 20/20 passing
✅ **Mocks creados**:
   - `databaseServiceFactory.mock.ts`
   - `externalServices.mock.ts` (Redis, ML, Qdrant)
   - `knowledgeBaseServices.mock.ts`

## Semana 1: Estabilización Backend
- [x] Auditar tests fallando
- [x] Crear mocks servicios externos
- [x] Fix tests críticos (databaseRole.test.ts)
- [x] Fix tests knowledgeBasePopulation (20 tests arreglados)
- [ ] Fix tests de integración (E2E)
- [ ] Fix tests de rutas API (404 errors)
- [ ] Fix tests de rate limiting

## Semana 2: ML y Servicios Externos
- [x] Mock MLForecastingService (externalServices.mock.ts)
- [x] Mock InjuryPredictionService (externalServices.mock.ts)
- [x] Mock Qdrant vector store (externalServices.mock.ts)
- [x] Fix KnowledgeBasePopulation tests (20 passing)
- [ ] Fix ML prediction routes tests

## Semana 3: Frontend Coverage
- [ ] Setup React Testing Library
- [ ] Tests componentes críticos
- [ ] Tests hooks y servicios

## Semana 4: Optimización
- [ ] Optimización móvil
- [ ] Fix TypeScript errors
- [ ] Validación final

## Métricas
- Antes: 55% passing (~397/718)
- Actual: 55%+ (5 tests críticos arreglados)
- Semana 1 Meta: 70% passing
- Semana 2 Meta: 85% passing
- Semana 4 Meta: 90% passing

## Notas Técnicas
- Mock creado: `src/__mocks__/databaseServiceFactory.mock.ts`
- Patrón: Clases TypeScript en lugar de jest.fn() para mejor tipado
- Estrategia: Aislar tests de base de datos real usando mocks en memoria
