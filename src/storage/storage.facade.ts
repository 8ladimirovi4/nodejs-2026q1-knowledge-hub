import type {
  ArticleStore,
  CategoryStore,
  CommentStore,
  UserStore,
} from './store.types';

export abstract class StorageFacade {
  abstract readonly users: UserStore;
  abstract readonly articles: ArticleStore;
  abstract readonly categories: CategoryStore;
  abstract readonly comments: CommentStore;
}
